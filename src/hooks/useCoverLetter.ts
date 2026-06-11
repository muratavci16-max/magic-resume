import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/compat/client";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useJobMatchStore } from "@/store/useJobMatchStore";
import { useCoverLetterStore, newCoverLetterDraft } from "@/store/useCoverLetterStore";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import { buildJobMatchPayload } from "@/lib/jobMatch";

interface RawCoverLetter {
  language?: string;
  subject?: string;
  greeting?: string;
  body?: string;
  closing?: string;
  signature?: string;
}

export function useCoverLetter() {
  const t = useTranslations("coverLetter");
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
  const { jobDescription } = useJobMatchStore();
  const {
    tone,
    length,
    setGenerating,
    setError,
    setDraft,
    openDialog
  } = useCoverLetterStore();

  const run = useCallback(async () => {
    if (!activeResume) return false;
    if (!isConfigured()) {
      toast.error(t("error.configRequired"));
      return false;
    }
    if (!jobDescription || jobDescription.trim().length < 30) {
      setError(t("error.too_short"));
      return false;
    }

    openDialog();
    setGenerating(true);

    try {
      const resumePayload = buildJobMatchPayload(activeResume);
      // Add the candidate name so the AI signs with the right person.
      const enrichedResume = {
        ...resumePayload,
        basic: {
          name: activeResume.basic?.name,
          title: activeResume.basic?.title,
          email: activeResume.basic?.email,
          location: activeResume.basic?.location
        }
      };
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

      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model: config.requiresModelId ? modelId : config.defaultModel,
          modelType: selectedModel,
          apiEndpoint: selectedModel === "openai" ? openaiApiEndpoint : undefined,
          jobDescription,
          resume: enrichedResume,
          tone,
          length
        })
      });

      if (!response.ok) {
        let msg = t("error.generic");
        try {
          const data = await response.json();
          const code = data?.error?.code as string | undefined;
          if (code) {
            const translated = t(`error.${code}`);
            if (translated && !translated.startsWith("coverLetter.error.")) {
              msg = translated;
            } else if (data?.error?.message) {
              msg = data.error.message;
            }
          } else if (data?.error?.message) {
            msg = data.error.message;
          }
        } catch {
          /* ignore */
        }
        setError(msg);
        return false;
      }

      const payload = (await response.json()) as { result?: RawCoverLetter };
      const raw = payload.result;
      if (!raw || !raw.body) {
        setError(t("error.parse"));
        return false;
      }

      const draft = newCoverLetterDraft();
      draft.resumeId = activeResume.id;
      draft.jobDescription = jobDescription;
      draft.tone = tone;
      draft.length = length;
      draft.language = raw.language;
      draft.subject = raw.subject ?? "";
      draft.greeting = raw.greeting ?? "";
      draft.body = raw.body;
      draft.closing = raw.closing ?? "";
      draft.signature = raw.signature ?? activeResume.basic?.name ?? "";

      setDraft(draft);
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
    tone,
    length,
    openDialog,
    setGenerating,
    setError,
    setDraft,
    t
  ]);

  return { run };
}
