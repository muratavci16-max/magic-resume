// Server-side helper to extract the actual job description from whatever the
// user paste in the textarea: a URL, raw HTML, or plain text. The goal is to
// feed ONLY the relevant job description block to the AI, not the surrounding
// navigation, sidebar or ads.

const COMMON_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// Selectors known to wrap the actual job-posting body across job boards.
// Order matters — the most specific selectors come first.
const CLASS_SELECTORS = [
  // LinkedIn
  "jobs-description-content__text",
  "jobs-description__content",
  "jobs-description--reformatted",
  "jobs-description",
  "job-details-module",
  "show-more-less-html__markup",
  "description__text",
  // Indeed
  "jobsearch-jobDescriptionText",
  "jobsearch-JobComponent-description",
  // Glassdoor / generic
  "jobDescriptionContent",
  "job-description",
  "JobDescription"
];

const ID_SELECTORS = [
  "jobDescriptionText",
  "job-details",
  "job-description"
];

const LOGIN_WALL_MARKERS = [
  "authwall",
  "sign in to view",
  "sign-up to see",
  "login-page",
  "join linkedin to see",
  "please sign in",
  "challenge.linkedin.com"
];

const NOISE_TAG_RE = /<(script|style|svg|button|nav|footer|header|aside|form|noscript)\b[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_NOISE_RE = /<(input|img)\b[^>]*>/gi;

export interface NormalizeSuccess {
  ok: true;
  description: string;
  source: "url" | "html" | "text";
}
export interface NormalizeFailure {
  ok: false;
  reason: "fetch_failed" | "login_wall" | "no_description" | "too_short";
  detail?: string;
}
export type NormalizeResult = NormalizeSuccess | NormalizeFailure;

export function isProbablyUrl(text: string): boolean {
  const t = text.trim();
  if (t.length > 2000 || /\s/.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isProbablyHtml(text: string): boolean {
  return /<\w+[^>]*>[\s\S]*?<\/\w+>/.test(text);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Extract the inner HTML between an opening tag (at openEndIdx) and its
// matching closing tag, honoring nested same-tag elements.
function extractBalanced(
  html: string,
  openEndIdx: number,
  tag: string
): string | null {
  const escTag = escapeRegex(tag);
  const openRe = new RegExp(`<${escTag}\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`</${escTag}\\s*>`, "gi");

  let depth = 1;
  let i = openEndIdx;
  let safety = 0;

  while (i < html.length && safety++ < 10000) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);

    if (!c) return null;
    if (o && o.index < c.index) {
      depth++;
      i = o.index + o[0].length;
    } else {
      depth--;
      if (depth === 0) return html.slice(openEndIdx, c.index);
      i = c.index + c[0].length;
    }
  }
  return null;
}

function findByClass(html: string, className: string): string | null {
  const re = new RegExp(
    `<(\\w+)\\b[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${escapeRegex(
      className
    )}\\b[^"']*["'][^>]*>`,
    "i"
  );
  const m = re.exec(html);
  if (!m) return null;
  return extractBalanced(html, m.index + m[0].length, m[1].toLowerCase());
}

function findById(html: string, id: string): string | null {
  const re = new RegExp(
    `<(\\w+)\\b[^>]*\\bid\\s*=\\s*["']${escapeRegex(id)}["'][^>]*>`,
    "i"
  );
  const m = re.exec(html);
  if (!m) return null;
  return extractBalanced(html, m.index + m[0].length, m[1].toLowerCase());
}

function htmlToCleanText(html: string): string {
  return html
    .replace(NOISE_TAG_RE, "")
    .replace(SELF_CLOSING_NOISE_RE, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|div|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function extractJobDescription(html: string): string | null {
  for (const cls of CLASS_SELECTORS) {
    const inner = findByClass(html, cls);
    if (inner) {
      const text = htmlToCleanText(inner);
      if (text.length > 80) return text;
    }
  }
  for (const id of ID_SELECTORS) {
    const inner = findById(html, id);
    if (inner) {
      const text = htmlToCleanText(inner);
      if (text.length > 80) return text;
    }
  }
  return null;
}

export function looksLikeLoginWall(html: string): boolean {
  const lower = html.toLowerCase();
  return LOGIN_WALL_MARKERS.some((m) => lower.includes(m));
}

async function fetchPageHtml(url: string): Promise<string> {
  // 10s timeout via AbortController
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": COMMON_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8"
      }
    });
    // LinkedIn returns 999 for bot UAs; treat any non-OK as failure.
    if (!res.ok) {
      throw new Error(`fetch_status_${res.status}`);
    }
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html") && !ctype.includes("xml")) {
      throw new Error(`fetch_non_html_${ctype}`);
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function normalizeJobInput(input: string): Promise<NormalizeResult> {
  const trimmed = input.trim();
  if (trimmed.length < 30) return { ok: false, reason: "too_short" };

  if (isProbablyUrl(trimmed)) {
    try {
      const html = await fetchPageHtml(trimmed);
      if (looksLikeLoginWall(html)) {
        return { ok: false, reason: "login_wall" };
      }
      const extracted = extractJobDescription(html);
      if (extracted) return { ok: true, description: extracted, source: "url" };
      return { ok: false, reason: "no_description" };
    } catch (e) {
      return {
        ok: false,
        reason: "fetch_failed",
        detail: e instanceof Error ? e.message : String(e)
      };
    }
  }

  if (isProbablyHtml(trimmed)) {
    const extracted = extractJobDescription(trimmed);
    if (extracted) return { ok: true, description: extracted, source: "html" };
    // Fallback: scrub all tags from the pasted HTML so AI sees only text.
    const cleaned = htmlToCleanText(trimmed);
    if (cleaned.length > 80) {
      return { ok: true, description: cleaned, source: "html" };
    }
    return { ok: false, reason: "no_description" };
  }

  return { ok: true, description: trimmed, source: "text" };
}
