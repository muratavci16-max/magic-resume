import { createFileRoute } from "@tanstack/react-router";
import { AIModelType, AI_MODEL_CONFIGS } from "@/config/ai";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";
import { normalizeJobInput } from "@/lib/server/jobDescriptionExtractor";

const SYSTEM_PROMPT = `You tailor resumes to specific job postings. You receive a job description and the candidate's resume sections, and you return improved copy that better matches the role — without inventing facts or changing the candidate's identity.

ABSOLUTE PRESERVATION RULES (never violate):
1. NEVER change or invent: person name, contact info, company names, brand names, product names, school names, degree names, dates, locations, GPA values, URLs.
2. NEVER add experience the candidate doesn't already have. Do not fabricate roles, employers, schools or projects.
3. NEVER change the structure of dates (keep the candidate's date format exactly).
4. Preserve every <li>, <ul>, <ol>, <p>, <strong>, <em> tag's role — output the same kind of HTML the input used.

WHAT YOU MAY DO:
- Rewrite phrasing to be more professional, concise and action-oriented.
- Reorder bullet points so the most relevant ones come first.
- Replace generic verbs with stronger ones (e.g. "worked on" → "owned", "led", "delivered").
- Incorporate vocabulary from the job posting WHERE THE CANDIDATE'S WORK GENUINELY APPLIES.
- For the SKILLS section only: you may APPEND new skill items that the candidate has clearly demonstrated elsewhere in their resume but didn't list. Do not invent skills they haven't shown.
- For the SUMMARY/selfEvaluation: keep the candidate's overall context and seniority, but align tone and keywords with the posting.

LANGUAGE:
- Detect the language of the candidate's resume content. Write your proposals in that same language. If the resume is in Turkish, output Turkish. If English, output English.

OUTPUT FORMAT (strict — return a single JSON object, no markdown fences, no prose):
{
  "jobSummary": {
    "title": "<role title from posting>",
    "company": "<company from posting if mentioned, else omit>",
    "summary": "<2-3 sentence neutral summary of what the role asks for>",
    "keyRequirements": ["<short concrete requirement>", ...],
    "softSkills": ["<soft skill word>", ...]
  },
  "proposals": {
    "selfEvaluation": { "proposed": "<HTML>", "rationale": "<one sentence>" },
    "skills": { "proposed": "<HTML>", "rationale": "<one sentence>" },
    "experience": [
      { "id": "<exact id from input>", "proposed": "<HTML>", "rationale": "<one sentence>" }
    ],
    "education": [
      { "id": "<exact id from input>", "proposed": "<HTML>", "rationale": "<one sentence>" }
    ],
    "projects": [
      { "id": "<exact id from input>", "proposed": "<HTML>", "rationale": "<one sentence>" }
    ]
  }
}

Rules for the output:
- Only include sections that were provided in the input.
- For experience/education/projects, the id MUST match the input id verbatim, and you MUST return one entry per input item.
- The proposed HTML for experience/education/projects refers to the DETAILS/DESCRIPTION field only — do NOT include company, role or date in the proposed string.
- If a section's content is already excellent and you would not change it, return the original content as "proposed" and "rationale": "Already aligned".
- Keep summaries and rationales in the same language as the resume.
- Output ONLY the JSON object. No backticks, no leading explanation, no trailing text.`;

interface JobMatchRequest {
  apiKey: string;
  model: string;
  modelType: AIModelType;
  apiEndpoint?: string;
  jobDescription: string;
  resume: Record<string, unknown>;
}

function buildUserPrompt(jobDescription: string, resume: Record<string, unknown>): string {
  return [
    "## Job posting",
    jobDescription.trim(),
    "",
    "## Candidate's resume sections (JSON)",
    JSON.stringify(resume, null, 2),
    "",
    "Tailor the proposable sections to the job. Return JSON per the rules in the system prompt."
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

export const Route = createFileRoute("/api/job-match")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as JobMatchRequest;
          const { apiKey, model, modelType, apiEndpoint, jobDescription, resume } = body;

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

          // Pull ONLY the real job description out of whatever was pasted
          // (URL / HTML / plain text). Never let the AI see surrounding noise.
          const normalized = await normalizeJobInput(jobDescription);
          if (!normalized.ok) {
            const messages: Record<string, string> = {
              too_short: "Job description is too short.",
              fetch_failed:
                "Could not load the URL. The site is blocking the request — please paste the job description text instead.",
              login_wall:
                "This page requires sign-in. Open the posting and paste the description text here.",
              no_description:
                "Could not find a job description in the page. Please paste the description text directly."
            };
            return Response.json(
              {
                error: {
                  code: normalized.reason,
                  message: messages[normalized.reason] ?? "Job description could not be processed.",
                  detail: normalized.detail
                }
              },
              { status: 400 }
            );
          }

          const userPrompt = buildUserPrompt(normalized.description, resume);

          let rawResponse: string;

          if (modelType === "gemini") {
            const geminiModelId = model || "gemini-flash-latest";
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: geminiModelId,
              systemInstruction: SYSTEM_PROMPT,
              generationConfig: {
                temperature: 0.3,
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
                temperature: 0.3,
                stream: false,
                response_format: { type: "json_object" }
              })
            });

            if (!upstream.ok) {
              const raw = await upstream.text();
              return Response.json(
                {
                  error: {
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
                  message: "Could not parse AI response as JSON",
                  raw: rawResponse?.slice(0, 1000)
                }
              },
              { status: 502 }
            );
          }

          return Response.json({
            result: parsed,
            jobInputSource: normalized.source,
            jobInputLength: normalized.description.length
          });
        } catch (error) {
          console.error("Job match error:", error);
          return Response.json(
            { error: { message: formatGeminiErrorMessage(error) } },
            { status: 500 }
          );
        }
      }
    }
  }
});
