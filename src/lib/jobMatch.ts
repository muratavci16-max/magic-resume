import type { ResumeData, Experience, Education, Project } from "@/types/resume";
import { extractATSSections } from "./ats";

// Sections that MUST be filled for the action to be enabled
export const REQUIRED_SECTIONS = ["basic", "selfEvaluation", "experience", "skills"] as const;

// Sections that participate in the dialog (basic excluded from AI proposals — preserved as-is)
export const PROPOSABLE_SECTIONS = [
  "selfEvaluation",
  "experience",
  "skills",
  "projects",
  "education",
  "certificates"
] as const;

export type JobMatchSectionId = (typeof PROPOSABLE_SECTIONS)[number] | "basic";

export type SectionStatus = "filled" | "missingRequired" | "missingOptional";

export interface SectionState {
  id: JobMatchSectionId | string;
  required: boolean;
  status: SectionStatus;
  hasContent: boolean;
}

function hasText(text: string | undefined | null): boolean {
  return !!text && text.replace(/<[^>]+>/g, "").trim().length > 0;
}

export function computeSectionStates(resume: ResumeData | null | undefined): SectionState[] {
  if (!resume) return [];
  const enabled = (resume.menuSections ?? []).filter((s) => s.enabled);

  const states: SectionState[] = enabled.map((s) => {
    const required = (REQUIRED_SECTIONS as readonly string[]).includes(s.id);
    let hasContent = false;

    switch (s.id) {
      case "basic":
        hasContent = !!(resume.basic?.name && resume.basic?.title);
        break;
      case "selfEvaluation":
        hasContent = hasText(resume.selfEvaluationContent);
        break;
      case "skills":
        hasContent = hasText(resume.skillContent);
        break;
      case "experience":
        hasContent = (resume.experience ?? []).some(
          (e) => e.visible !== false && (e.company || e.position || hasText(e.details))
        );
        break;
      case "education":
        hasContent = (resume.education ?? []).some(
          (e) => e.visible !== false && (e.school || e.major || hasText(e.description))
        );
        break;
      case "projects":
        hasContent = (resume.projects ?? []).some(
          (p) => p.visible !== false && (p.name || hasText(p.description))
        );
        break;
      case "certificates":
        hasContent = (resume.certificates ?? []).length > 0;
        break;
      default:
        // custom sections
        hasContent = (resume.customData?.[s.id] ?? []).some(
          (i) => i.visible !== false && (i.title || i.subtitle || i.description)
        );
    }

    return {
      id: s.id,
      required,
      hasContent,
      status: hasContent
        ? "filled"
        : required
        ? "missingRequired"
        : "missingOptional"
    };
  });

  return states;
}

export function allRequiredFilled(states: SectionState[]): boolean {
  return !states.some((s) => s.status === "missingRequired");
}

// Build payload sections for the AI. Each section is a structured object so the
// AI knows what entities MUST stay verbatim.
export interface ExperienceItemPayload {
  id: string;
  company: string;
  position: string;
  date: string;
  details: string;
}
export interface EducationItemPayload {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  description: string;
}
export interface ProjectItemPayload {
  id: string;
  name: string;
  role: string;
  date: string;
  description: string;
  link?: string;
}

export interface JobMatchPayload {
  selfEvaluation?: string;
  skills?: string;
  experience?: ExperienceItemPayload[];
  education?: EducationItemPayload[];
  projects?: ProjectItemPayload[];
}

export function buildJobMatchPayload(resume: ResumeData): JobMatchPayload {
  const out: JobMatchPayload = {};

  if (hasText(resume.selfEvaluationContent)) {
    out.selfEvaluation = resume.selfEvaluationContent;
  }
  if (hasText(resume.skillContent)) {
    out.skills = resume.skillContent;
  }

  const experience = (resume.experience ?? [])
    .filter((e) => e.visible !== false)
    .map<ExperienceItemPayload>((e: Experience) => ({
      id: e.id,
      company: e.company || "",
      position: e.position || "",
      date: e.date || "",
      details: e.details || ""
    }));
  if (experience.length) out.experience = experience;

  const education = (resume.education ?? [])
    .filter((e) => e.visible !== false)
    .map<EducationItemPayload>((e: Education) => ({
      id: e.id,
      school: e.school || "",
      degree: e.degree || "",
      major: e.major || "",
      startDate: e.startDate || "",
      endDate: e.endDate || "",
      gpa: e.gpa,
      description: e.description || ""
    }));
  if (education.length) out.education = education;

  const projects = (resume.projects ?? [])
    .filter((p) => p.visible !== false)
    .map<ProjectItemPayload>((p: Project) => ({
      id: p.id,
      name: p.name || "",
      role: p.role || "",
      date: p.date || "",
      description: p.description || "",
      link: p.link
    }));
  if (projects.length) out.projects = projects;

  return out;
}

// AI response shape we expect (parsed/validated client-side)
export interface JobMatchProposal {
  selfEvaluation?: { proposed: string; rationale?: string };
  skills?: { proposed: string; rationale?: string };
  experience?: Array<{ id: string; proposed: string; rationale?: string }>;
  education?: Array<{ id: string; proposed: string; rationale?: string }>;
  projects?: Array<{ id: string; proposed: string; rationale?: string }>;
}

export interface JobSummary {
  title?: string;
  company?: string;
  summary?: string;
  keyRequirements?: string[];
  softSkills?: string[];
}

export interface JobMatchResult {
  jobSummary: JobSummary;
  proposals: JobMatchProposal;
}

// Re-export ATS section extractor for convenience
export { extractATSSections };
