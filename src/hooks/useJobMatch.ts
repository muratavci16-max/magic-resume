import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/compat/client";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useResumeStore } from "@/store/useResumeStore";
import {
  useJobMatchStore,
  proposalKey,
  type ProposalState
} from "@/store/useJobMatchStore";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import {
  buildJobMatchPayload,
  type JobMatchResult,
  type JobMatchProposal
} from "@/lib/jobMatch";

export function useJobMatch() {
  const t = useTranslations("jobMatch");
  const {
    selectedModel,
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    deepseekModelId,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    geminiApiKey,
    geminiModelId,
    isConfigured
  } = useAIConfigStore();
  const { activeResume } = useResumeStore();
  const {
    jobDescription,
    setAnalyzing,
    setError,
    setResult,
    openDialog
  } = useJobMatchStore();

  const run = useCallback(async () => {
    if (!activeResume) return false;
    if (!isConfigured()) {
      toast.error(t("error.configRequired"));
      return false;
    }
    if (!jobDescription || jobDescription.trim().length < 30) {
      setError(t("expanded.missingJobInput"));
      return false;
    }

    openDialog();
    setAnalyzing(true);

    try {
      const resumePayload = buildJobMatchPayload(activeResume);
      const config = AI_MODEL_CONFIGS[selectedModel];
      const apiKey =
        selectedModel === "doubao"
          ? doubaoApiKey
          : selectedModel === "openai"
          ? openaiApiKey
          : selectedModel === "gemini"
          ? geminiApiKey
          : deepseekApiKey;
      const modelId =
        selectedModel === "doubao"
          ? doubaoModelId
          : selectedModel === "openai"
          ? openaiModelId
          : selectedModel === "gemini"
          ? geminiModelId
          : deepseekModelId;

      const response = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model: config.requiresModelId ? modelId : config.defaultModel,
          modelType: selectedModel,
          apiEndpoint: selectedModel === "openai" ? openaiApiEndpoint : undefined,
          jobDescription,
          resume: resumePayload
        })
      });

      if (!response.ok) {
        let msg = t("error.generic");
        try {
          const data = await response.json();
          if (data?.error?.message) msg = data.error.message;
        } catch {
          /* ignore */
        }
        setError(msg);
        return false;
      }

      const payload = (await response.json()) as { result?: JobMatchResult };
      const raw = payload.result;
      if (!raw || !raw.proposals) {
        setError(t("error.parse"));
        return false;
      }

      const proposals = buildProposals(raw.proposals);
      setResult(raw, proposals);
      return true;
    } catch (e) {
      setError(t("error.generic"));
      return false;
    }
  }, [
    activeResume,
    isConfigured,
    selectedModel,
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    deepseekModelId,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    geminiApiKey,
    geminiModelId,
    jobDescription,
    openDialog,
    setAnalyzing,
    setError,
    setResult,
    t
  ]);

  return { run };
}

function buildProposals(
  raw: JobMatchProposal
): Record<string, ProposalState> {
  const out: Record<string, ProposalState> = {};

  if (raw.selfEvaluation?.proposed) {
    const k = proposalKey("selfEvaluation");
    out[k] = {
      sectionId: "selfEvaluation",
      proposed: raw.selfEvaluation.proposed,
      rationale: raw.selfEvaluation.rationale,
      status: "pending"
    };
  }
  if (raw.skills?.proposed) {
    const k = proposalKey("skills");
    out[k] = {
      sectionId: "skills",
      proposed: raw.skills.proposed,
      rationale: raw.skills.rationale,
      status: "pending"
    };
  }
  for (const e of raw.experience ?? []) {
    if (!e?.id || !e?.proposed) continue;
    out[proposalKey("experience", e.id)] = {
      sectionId: "experience",
      itemId: e.id,
      proposed: e.proposed,
      rationale: e.rationale,
      status: "pending"
    };
  }
  for (const e of raw.education ?? []) {
    if (!e?.id || !e?.proposed) continue;
    out[proposalKey("education", e.id)] = {
      sectionId: "education",
      itemId: e.id,
      proposed: e.proposed,
      rationale: e.rationale,
      status: "pending"
    };
  }
  for (const p of raw.projects ?? []) {
    if (!p?.id || !p?.proposed) continue;
    out[proposalKey("projects", p.id)] = {
      sectionId: "projects",
      itemId: p.id,
      proposed: p.proposed,
      rationale: p.rationale,
      status: "pending"
    };
  }

  return out;
}

// Apply accepted proposals to the resume
export function useApplyJobMatch() {
  const t = useTranslations("jobMatch.dialog");
  const { activeResume } = useResumeStore();
  const {
    updateSelfEvaluationContent,
    updateSkillContent,
    updateExperienceBatch,
    updateEducationBatch,
    updateProjectsBatch
  } = useResumeStore();
  const { proposals, closeDialog, reset } = useJobMatchStore();

  return useCallback(() => {
    if (!activeResume) return;
    const accepted = Object.values(proposals).filter((p) => p.status === "accepted");
    if (accepted.length === 0) {
      toast.message(t("noChangesToast"));
      closeDialog();
      return;
    }

    const expById: Record<string, string> = {};
    const eduById: Record<string, string> = {};
    const projById: Record<string, string> = {};
    let nextSummary: string | null = null;
    let nextSkills: string | null = null;

    for (const p of accepted) {
      if (p.sectionId === "selfEvaluation") nextSummary = p.proposed;
      else if (p.sectionId === "skills") nextSkills = p.proposed;
      else if (p.sectionId === "experience" && p.itemId) expById[p.itemId] = p.proposed;
      else if (p.sectionId === "education" && p.itemId) eduById[p.itemId] = p.proposed;
      else if (p.sectionId === "projects" && p.itemId) projById[p.itemId] = p.proposed;
    }

    if (nextSummary !== null) updateSelfEvaluationContent(nextSummary);
    if (nextSkills !== null) updateSkillContent(nextSkills);

    if (Object.keys(expById).length) {
      const next = (activeResume.experience ?? []).map((e) =>
        expById[e.id] ? { ...e, details: expById[e.id] } : e
      );
      updateExperienceBatch(next);
    }
    if (Object.keys(eduById).length) {
      const next = (activeResume.education ?? []).map((e) =>
        eduById[e.id] ? { ...e, description: eduById[e.id] } : e
      );
      updateEducationBatch(next);
    }
    if (Object.keys(projById).length) {
      const next = (activeResume.projects ?? []).map((p) =>
        projById[p.id] ? { ...p, description: projById[p.id] } : p
      );
      updateProjectsBatch(next);
    }

    toast.success(t("appliedToast"));
    closeDialog();
    // Keep result/job description so user can re-open; but clear if they want fresh
    setTimeout(() => reset(), 400);
  }, [
    activeResume,
    proposals,
    updateSelfEvaluationContent,
    updateSkillContent,
    updateExperienceBatch,
    updateEducationBatch,
    updateProjectsBatch,
    closeDialog,
    reset,
    t
  ]);
}
