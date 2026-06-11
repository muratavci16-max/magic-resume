import type { ResumeData, ResumeTranslation } from "@/types/resume";

// Returns a shallow-cloned resume with the requested translation merged on top
// of editable prose fields. Identifiers (names, dates, ids, urls) are left
// untouched because the AI never returned them.
export function mergeTranslation(
  resume: ResumeData,
  language: string | null
): ResumeData {
  if (!language) return resume;
  const tr = resume.translations?.[language];
  if (!tr) return resume;

  const expById = new Map(
    (tr.experience ?? []).map((x) => [x.id, x.details] as const)
  );
  const eduById = new Map(
    (tr.education ?? []).map((x) => [x.id, x.description] as const)
  );
  const projById = new Map(
    (tr.projects ?? []).map((x) => [x.id, x.description] as const)
  );

  return {
    ...resume,
    basic: {
      ...resume.basic,
      title: tr.basic?.title ?? resume.basic?.title,
      location: tr.basic?.location ?? resume.basic?.location,
      employementStatus: tr.basic?.employementStatus ?? resume.basic?.employementStatus
    },
    selfEvaluationContent: tr.selfEvaluationContent ?? resume.selfEvaluationContent,
    skillContent: tr.skillContent ?? resume.skillContent,
    experience: (resume.experience ?? []).map((e) => {
      const next = expById.get(e.id);
      return next != null ? { ...e, details: next } : e;
    }),
    education: (resume.education ?? []).map((e) => {
      const next = eduById.get(e.id);
      return next != null ? { ...e, description: next } : e;
    }),
    projects: (resume.projects ?? []).map((p) => {
      const next = projById.get(p.id);
      return next != null ? { ...p, description: next } : p;
    })
  };
}

// Build the payload we send to /api/translate-resume: only fields that the AI
// is allowed to translate.
export function buildTranslationPayload(resume: ResumeData) {
  return {
    basic: {
      title: resume.basic?.title || "",
      location: resume.basic?.location || "",
      employementStatus: resume.basic?.employementStatus || ""
    },
    selfEvaluationContent: resume.selfEvaluationContent || "",
    skillContent: resume.skillContent || "",
    experience: (resume.experience ?? [])
      .filter((e) => e.visible !== false)
      .map((e) => ({ id: e.id, details: e.details || "" })),
    education: (resume.education ?? [])
      .filter((e) => e.visible !== false)
      .map((e) => ({ id: e.id, description: e.description || "" })),
    projects: (resume.projects ?? [])
      .filter((p) => p.visible !== false)
      .map((p) => ({ id: p.id, description: p.description || "" }))
  };
}

export function isTranslationStale(
  resume: ResumeData,
  language: string
): boolean {
  const tr = resume.translations?.[language];
  if (!tr || !tr.staleSourceUpdatedAt) return false;
  return tr.staleSourceUpdatedAt !== resume.updatedAt;
}

// Shape returned by the API endpoint.
export interface RawTranslationResponse {
  basic?: {
    title?: string;
    location?: string;
    employementStatus?: string;
  };
  selfEvaluationContent?: string;
  skillContent?: string;
  experience?: Array<{ id: string; details?: string }>;
  education?: Array<{ id: string; description?: string }>;
  projects?: Array<{ id: string; description?: string }>;
}

export function toResumeTranslation(
  raw: RawTranslationResponse,
  sourceUpdatedAt: string
): ResumeTranslation {
  return {
    translatedAt: Date.now(),
    staleSourceUpdatedAt: sourceUpdatedAt,
    basic: {
      title: raw.basic?.title,
      location: raw.basic?.location,
      employementStatus: raw.basic?.employementStatus
    },
    selfEvaluationContent: raw.selfEvaluationContent,
    skillContent: raw.skillContent,
    experience: (raw.experience ?? []).filter((x) => x?.id),
    education: (raw.education ?? []).filter((x) => x?.id),
    projects: (raw.projects ?? []).filter((x) => x?.id)
  };
}
