import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CoverLetterTone = "formal" | "friendly" | "confident";
export type CoverLetterLength = "short" | "medium" | "long";

export interface CoverLetter {
  id: string;
  resumeId: string;
  createdAt: number;
  jobDescription: string; // the source the AI saw (normalized)
  tone: CoverLetterTone;
  length: CoverLetterLength;
  language?: string;
  subject: string;
  greeting: string;
  body: string; // HTML
  closing: string;
  signature: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface CoverLetterState {
  // Per-resume saved letters (kept across sessions).
  byResume: Record<string, CoverLetter[]>;

  // Live generation UI state (not persisted).
  expanded: boolean;
  dialogOpen: boolean;
  isGenerating: boolean;
  error: string | null;
  draft: CoverLetter | null;
  tone: CoverLetterTone;
  length: CoverLetterLength;

  toggleExpanded: () => void;
  setExpanded: (v: boolean) => void;
  openDialog: () => void;
  closeDialog: () => void;
  setTone: (t: CoverLetterTone) => void;
  setLength: (l: CoverLetterLength) => void;
  setGenerating: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setDraft: (letter: CoverLetter | null) => void;

  saveDraft: (resumeId: string) => string | null;
  list: (resumeId: string | undefined | null) => CoverLetter[];
  remove: (resumeId: string, id: string) => void;
  reset: () => void;
}

const initialLive = {
  expanded: false,
  dialogOpen: false,
  isGenerating: false,
  error: null as string | null,
  draft: null as CoverLetter | null,
  tone: "formal" as CoverLetterTone,
  length: "medium" as CoverLetterLength
};

export const useCoverLetterStore = create<CoverLetterState>()(
  persist(
    (set, get) => ({
      byResume: {},
      ...initialLive,

      toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
      setExpanded: (v) => set({ expanded: v }),
      openDialog: () => set({ dialogOpen: true }),
      closeDialog: () => set({ dialogOpen: false }),
      setTone: (t) => set({ tone: t }),
      setLength: (l) => set({ length: l }),
      setGenerating: (v) => set({ isGenerating: v, error: v ? null : get().error }),
      setError: (msg) => set({ error: msg, isGenerating: false }),
      setDraft: (letter) => set({ draft: letter, isGenerating: false, error: null }),

      saveDraft: (resumeId) => {
        const d = get().draft;
        if (!d) return null;
        const id = d.id || uuid();
        const saved: CoverLetter = { ...d, id, resumeId };
        set((s) => {
          const prev = s.byResume[resumeId] ?? [];
          // Replace if exists, otherwise prepend
          const without = prev.filter((x) => x.id !== id);
          return {
            byResume: { ...s.byResume, [resumeId]: [saved, ...without].slice(0, 20) }
          };
        });
        return id;
      },

      list: (resumeId) =>
        resumeId ? get().byResume[resumeId] ?? [] : [],

      remove: (resumeId, id) =>
        set((s) => {
          const list = s.byResume[resumeId];
          if (!list) return s;
          return {
            byResume: {
              ...s.byResume,
              [resumeId]: list.filter((x) => x.id !== id)
            }
          };
        }),

      reset: () => set({ ...initialLive })
    }),
    {
      name: "halname-cover-letters",
      // Persist saved letters only — the in-flight draft/dialog state is
      // session-scoped.
      partialize: (s) => ({ byResume: s.byResume })
    }
  )
);

export function newCoverLetterDraft(): CoverLetter {
  return {
    id: uuid(),
    resumeId: "",
    createdAt: Date.now(),
    jobDescription: "",
    tone: "formal",
    length: "medium",
    subject: "",
    greeting: "",
    body: "",
    closing: "",
    signature: ""
  };
}
