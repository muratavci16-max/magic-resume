import { create } from "zustand";
import type { JobMatchResult } from "@/lib/jobMatch";

export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface ProposalState {
  // Identifies the section. For experience/projects/education, also includes itemId.
  sectionId: string;
  itemId?: string;
  proposed: string;
  rationale?: string;
  status: ProposalStatus;
}

export type ProposalKey = string; // section[:itemId]

export function proposalKey(sectionId: string, itemId?: string): ProposalKey {
  return itemId ? `${sectionId}:${itemId}` : sectionId;
}

interface JobMatchState {
  expanded: boolean;
  dialogOpen: boolean;
  jobDescription: string;
  isAnalyzing: boolean;
  error: string | null;
  result: JobMatchResult | null;
  proposals: Record<ProposalKey, ProposalState>;

  toggleExpanded: () => void;
  setExpanded: (v: boolean) => void;
  openDialog: () => void;
  closeDialog: () => void;
  setJobDescription: (text: string) => void;
  setAnalyzing: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setResult: (result: JobMatchResult, proposals: Record<ProposalKey, ProposalState>) => void;
  setProposalStatus: (key: ProposalKey, status: ProposalStatus) => void;
  acceptAllPending: () => void;
  reset: () => void;
}

const initial = {
  expanded: false,
  dialogOpen: false,
  jobDescription: "",
  isAnalyzing: false,
  error: null,
  result: null as JobMatchResult | null,
  proposals: {} as Record<ProposalKey, ProposalState>
};

export const useJobMatchStore = create<JobMatchState>()((set) => ({
  ...initial,
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setExpanded: (v) => set({ expanded: v }),
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalyzing: (v) => set({ isAnalyzing: v, error: v ? null : undefined }),
  setError: (msg) => set({ error: msg, isAnalyzing: false }),
  setResult: (result, proposals) =>
    set({ result, proposals, isAnalyzing: false, error: null }),
  setProposalStatus: (key, status) =>
    set((s) => ({
      proposals: s.proposals[key]
        ? { ...s.proposals, [key]: { ...s.proposals[key], status } }
        : s.proposals
    })),
  acceptAllPending: () =>
    set((s) => {
      const next: Record<ProposalKey, ProposalState> = {};
      for (const [k, v] of Object.entries(s.proposals)) {
        next[k] = v.status === "pending" ? { ...v, status: "accepted" } : v;
      }
      return { proposals: next };
    }),
  reset: () => set({ ...initial })
}));
