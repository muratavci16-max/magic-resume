import { createFileRoute } from "@tanstack/react-router";
import { AIModelType, AI_MODEL_CONFIGS } from "@/config/ai";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";

const SYSTEM_PROMPT = `You are a professional translator for resumes. You translate ONLY the prose passages of the resume into the requested target language while preserving every identifier verbatim.

ABSOLUTE PRESERVATION RULES (never violate):
1. NEVER translate or alter: person names, company names, brand names, product names, school names, degree names (B.Sc., M.Sc., MBA, etc.), URLs, email addresses, phone numbers, GPA values.
2. NEVER change dates or date formats.
3. NEVER alter the candidate's job titles' company qualifier — i.e. if it says "Senior Engineer @ Stripe", the company stays "Stripe".
4. NEVER add or remove bullet points. Translate the bullets one-for-one in the same order.
5. Preserve the candidate's HTML structure exactly: same <ul>, <li>, <p>, <strong>, <br> tags in the same positions.
6. Localize idioms only when there is a natural equivalent in the target language. Otherwise translate literally and idiomatically.

WHAT YOU TRANSLATE:
- basic.title (job title) — translate the role descriptor, keep brand/company qualifiers.
- basic.location — translate the city/country name to the target language's conventional spelling.
- basic.employementStatus — translate.
- selfEvaluation — translate the whole paragraph.
- skills — translate category labels and skill names where appropriate (e.g. "Frontend Frameworks" → German equivalent). Keep technology names (React, TypeScript, Cloudflare) as-is.
- experience[i].details — translate the bullets, preserve metrics and proper nouns.
- education[i].description — translate.
- projects[i].description — translate. Project names stay verbatim.

OUTPUT FORMAT (strict — single JSON object, no markdown fences, no prose):
{
  "basic": { "title": "...", "location": "...", "employementStatus": "..." },
  "selfEvaluationContent": "<HTML>",
  "skillContent": "<HTML>",
  "experience": [ { "id": "<exact id>", "details": "<HTML>" } ],
  "education": [ { "id": "<exact id>", "description": "<HTML>" } ],
  "projects": [ { "id": "<exact id>", "description": "<HTML>" } ]
}

- Include only the sections that were provided in the input.
- Echo every input id verbatim.
- Output ONLY the JSON. No backticks, no leading explanation, no trailing text.`;

const LANGUAGE_HINTS: Record<string, string> = {
  en: "English",
  tr: "Turkish (Türkçe)",
  de: "German (Deutsch)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  it: "Italian (Italiano)",
  pt: "Portuguese (Português)",
  nl: "Dutch (Nederlands)",
  ar: "Arabic (العربية)",
  ru: "Russian (Русский)"
};

interface TranslateRequest {
  apiKey: string;
  model: string;
  modelType: AIModelType;
  apiEndpoint?: string;
  targetLanguage: string;
  resume: Record<string, unknown>;
}

function buildUserPrompt(targetLanguage: string, resume: Record<string, unknown>): string {
  const langName = LANGUAGE_HINTS[targetLanguage] ?? targetLanguage;
  return [
    `Target language: ${langName} (ISO code: ${targetLanguage}).`,
    "",
    "Translate the following resume sections per the system prompt's rules.",
    "Return JSON only.",
    "",
    "## Resume (JSON)",
    JSON.stringify(resume, null, 2)
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

export const Route = createFileRoute("/api/translate-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as TranslateRequest;
          const {
            apiKey,
            model,
            modelType,
            apiEndpoint,
            targetLanguage,
            resume
          } = body;

          if (!targetLanguage || targetLanguage.length < 2 || targetLanguage.length > 5) {
            return Response.json(
              { error: { code: "bad_language", message: "Invalid target language" } },
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

          const userPrompt = buildUserPrompt(targetLanguage, resume);

          let rawResponse: string;

          if (modelType === "gemini") {
            const geminiModelId = model || "gemini-flash-latest";
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: geminiModelId,
              systemInstruction: SYSTEM_PROMPT,
              generationConfig: {
                temperature: 0.2,
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
                temperature: 0.2,
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
          console.error("Translate error:", error);
          return Response.json(
            { error: { code: "internal", message: formatGeminiErrorMessage(error) } },
            { status: 500 }
          );
        }
      }
    }
  }
});
