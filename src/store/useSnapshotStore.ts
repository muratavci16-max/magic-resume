import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResumeData } from "@/types/resume";

export type SnapshotTrigger =
  | "manual"
  | "tailor"
  | "polish"
  | "translate"
  | "import";

// We snapshot the full mutable state of the resume so a restore is byte-for-byte.
// Layout/config is included because users do reorder sections / change themes
// and might want to roll those back too.
export interface ResumeSnapshot {
  id: string;
  resumeId: string;
  createdAt: number;
  trigger: SnapshotTrigger;
  label: string;
  snapshot: SnapshotData;
}

export interface SnapshotData {
  title: string;
  templateId?: string | null;
  basic: ResumeData["basic"];
  experience: ResumeData["experience"];
  education: ResumeData["education"];
  projects: ResumeData["projects"];
  certificates: ResumeData["certificates"];
  skillContent: ResumeData["skillContent"];
  selfEvaluationContent: ResumeData["selfEvaluationContent"];
  customData: ResumeData["customData"];
  menuSections: ResumeData["menuSections"];
  globalSettings: ResumeData["globalSettings"];
}

const MAX_PER_RESUME = 25;

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface SnapshotState {
  byResume: Record<string, ResumeSnapshot[]>;
  push: (
    resumeId: string,
    data: SnapshotData,
    trigger: SnapshotTrigger,
    label?: string
  ) => string;
  list: (resumeId: string | undefined | null) => ResumeSnapshot[];
  remove: (resumeId: string, snapshotId: string) => void;
  clearForResume: (resumeId: string) => void;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      byResume: {},

      push: (resumeId, data, trigger, label) => {
        const snap: ResumeSnapshot = {
          id: uuid(),
          resumeId,
          createdAt: Date.now(),
          trigger,
          label: label || defaultLabelFor(trigger),
          snapshot: data
        };
        set((s) => {
          const prev = s.byResume[resumeId] ?? [];
          const next = [snap, ...prev].slice(0, MAX_PER_RESUME);
          return { byResume: { ...s.byResume, [resumeId]: next } };
        });
        return snap.id;
      },

      list: (resumeId) => {
        if (!resumeId) return [];
        return get().byResume[resumeId] ?? [];
      },

      remove: (resumeId, snapshotId) =>
        set((s) => {
          const list = s.byResume[resumeId];
          if (!list) return s;
          return {
            byResume: {
              ...s.byResume,
              [resumeId]: list.filter((x) => x.id !== snapshotId)
            }
          };
        }),

      clearForResume: (resumeId) =>
        set((s) => {
          if (!s.byResume[resumeId]) return s;
          const next = { ...s.byResume };
          delete next[resumeId];
          return { byResume: next };
        })
    }),
    { name: "halname-snapshots" }
  )
);

function defaultLabelFor(trigger: SnapshotTrigger): string {
  switch (trigger) {
    case "tailor":
      return "Before tailoring to job";
    case "polish":
      return "Before AI polish";
    case "translate":
      return "Before translation";
    case "import":
      return "Before import";
    case "manual":
    default:
      return "Manual snapshot";
  }
}

export function extractSnapshotData(resume: ResumeData): SnapshotData {
  return {
    title: resume.title,
    templateId: resume.templateId,
    basic: resume.basic,
    experience: resume.experience,
    education: resume.education,
    projects: resume.projects,
    certificates: resume.certificates,
    skillContent: resume.skillContent,
    selfEvaluationContent: resume.selfEvaluationContent,
    customData: resume.customData,
    menuSections: resume.menuSections,
    globalSettings: resume.globalSettings
  };
}
