import { createFileRoute } from "@tanstack/react-router";
import { AIModelType, AI_MODEL_CONFIGS } from "@/config/ai";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";
import { normalizeJobInput } from "@/lib/server/jobDescriptionExtractor";

const SYSTEM_PROMPT = `You are a professional career writer who composes high-quality cover letters tailored to specific job postings.

ABSOLUTE PRESERVATION RULES (never violate):
1. NEVER invent facts about the candidate. Use only what the resume provides — name, companies, products, schools, achievements, dates.
2. NEVER change or fake company names, brand names, product names, school names or dates from the resume.
3. NEVER fabricate a hiring manager's name. If the posting includes one, use it; otherwise open with a neutral greeting.

WRITING RULES:
- Match the tone the caller asks for ("formal", "friendly" or "confident") while staying professional.
- Match the length the caller asks for ("short" ≈ 180 words, "medium" ≈ 280 words, "long" ≈ 400 words).
- Pull 2–4 concrete achievements from the resume that align with the job's requirements. Quote metrics where the resume already has them.
- Mirror vocabulary and priorities from the job posting where the candidate's experience genuinely matches.
- Strong opening sentence that names the specific role and shows why this candidate is a real fit.
- Close with a polite, confident call to action.
- Detect the candidate's resume language. Write the cover letter in that same language. If the resume is in Turkish, output Turkish. If English, output English.

OUTPUT FORMAT (strict — single JSON object, no markdown fences, no prose):
{
  "language": "tr" | "en",
  "subject": "<one-line subject suitable for an email>",
  "greeting": "<e.g. 'Dear Hiring Manager,' or 'Sayın Yetkili,'>",
  "body": "<HTML — paragraphs wrapped in <p>...</p>. No headings, no lists, just paragraphs. 2 to 5 paragraphs.>",
  "closing": "<e.g. 'Sincerely,' or 'Saygılarımla,'>",
  "signature": "<candidate's name from the resume>"
}

- Output ONLY the JSON. No backticks, no leading explanation, no trailing text.`;

interface CoverLetterRequest {
  apiKey: string;
  model: string;
  modelType: AIModelType;
  apiEndpoint?: string;
  jobDescription: string;
  resume: Record<string, unknown>;
  tone?: "formal" | "friendly" | "confident";
  length?: "short" | "medium" | "long";
}

function buildUserPrompt(
  jobDescription: string,
  resume: Record<string, unknown>,
  tone: string,
  length: string
): string {
  return [
    `Tone: ${tone}.`,
    `Target length: ${length}.`,
    "",
    "## Job posting",
    jobDescription.trim(),
    "",
    "## Candidate's resume (JSON)",
    JSON.stringify(resume, null, 2),
    "",
    "Write a cover letter tailored to this job. Return JSON per the system prompt."
  ].join("\n");
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

export const Route = createFileRoute("/api/cover-letter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as CoverLetterRequest;
          const {
            apiKey,
            model,
            modelType,
            apiEndpoint,
            jobDescription,
            resume,
            tone = "formal",
            length = "medium"
          } = body;

          if (!jobDescription || jobDescription.trim().length < 30) {
            return Response.json(
              { error: { code: "too_short", message: "Job description is too short" } },
              { status: 400 }
            );
          }

          const modelConfig = AI_MODEL_CONFIGS[modelType];
          if (!modelConfig) {
            return Response.json(
              { error: { code: "invalid_model", message: "Invalid model type" } },
              { status: 400 }
            );
          }

          if (!resume || typeof resume !== "object" || Object.keys(resume).length === 0) {
            return Response.json(
              { error: { code: "no_resume", message: "No resume sections provided" } },
              { status: 400 }
            );
          }

          const normalized = await normalizeJobInput(jobDescription);
          if (!normalized.ok) {
            const messages: Record<string, string> = {
              too_short: "Job description is too short.",
              fetch_failed:
                "Could not load the URL. Please paste the job description text instead.",
              login_wall:
                "This page requires sign-in. Paste the description text here.",
              no_description:
                "Could not find a job description in the page. Paste the description text directly."
            };
            return Response.json(
              {
                error: {
                  code: normalized.reason,
                  message: messages[normalized.reason] ?? "Could not process the job description.",
                  detail: normalized.detail
                }
              },
              { status: 400 }
            );
          }

          const userPrompt = buildUserPrompt(normalized.description, resume, tone, length);

          let rawResponse: string;

          if (modelType === "gemini") {
            const geminiModelId = model || "gemini-flash-latest";
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: geminiModelId,
              systemInstruction: SYSTEM_PROMPT,
              generationConfig: {
                temperature: 0.55,
                responseMimeType: "application/json"
              }
            });
            const result = await modelInstance.generateContent(userPrompt);
            rawResponse = result.response.text();
          } else {
            const upstream = await fetch(modelConfig.url(apiEndpoint), {
              method: "POST",
              headers: modelConfig.headers(apiKey),
              body: JSON.stringify({
                model: modelConfig.requiresModelId ? model : modelConfig.defaultModel,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt }
                ],
                temperature: 0.55,
                stream: false,
                response_format: { type: "json_object" }
              })
            });

            if (!upstream.ok) {
              const raw = await upstream.text();
              return Response.json(
                {
                  error: {
                    code: "upstream",
                    message: `Upstream API error: ${upstream.status} ${upstream.statusText}`,
                    detail: raw
                  }
                },
                { status: upstream.status }
              );
            }

            const data = (await upstream.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            rawResponse = data.choices?.[0]?.message?.content ?? "";
          }

          let parsed: unknown;
          try {
            parsed = extractJson(rawResponse);
          } catch (e) {
            return Response.json(
              {
                error: {
                  code: "parse",
                  message: "Could not parse AI response as JSON",
                  raw: rawResponse?.slice(0, 800)
                }
              },
              { status: 502 }
            );
          }

          return Response.json({ result: parsed });
        } catch (error) {
          console.error("Cover letter error:", error);
          return Response.json(
            { error: { code: "internal", message: formatGeminiErrorMessage(error) } },
            { status: 500 }
          );
        }
      }
    }
  }
});
