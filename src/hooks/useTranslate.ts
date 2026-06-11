import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/compat/client";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useResumeStore } from "@/store/useResumeStore";
import {
  useTranslationStore
} from "@/store/useTranslationStore";
import {
  useSnapshotStore,
  extractSnapshotData
} from "@/store/useSnapshotStore";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import {
  buildTranslationPayload,
  toResumeTranslation,
  type RawTranslationResponse
} from "@/lib/applyTranslation";

export function useTranslate() {
  const t = useTranslations("translation");
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
  const { activeResume, updateResume } = useResumeStore();
  const { setTranslating, setError, setViewLanguage, closePicker } = useTranslationStore();
  const pushSnapshot = useSnapshotStore((s) => s.push);

  const translate = useCallback(
    async (targetLanguage: string): Promise<boolean> => {
      if (!activeResume?.id) return false;
      if (!isConfigured()) {
        toast.error(t("error.configRequired"));
        return false;
      }
      if (targetLanguage.length < 2 || targetLanguage.length > 5) {
        setError(t("error.bad_language"));
        return false;
      }

      // Snapshot before we save the translation so the user can roll back.
      pushSnapshot(activeResume.id, extractSnapshotData(activeResume), "translate");

      setTranslating(true);
      try {
        const payload = buildTranslationPayload(activeResume);
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

        const response = await fetch("/api/translate-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            model: config.requiresModelId ? modelId : config.defaultModel,
            modelType: selectedModel,
            apiEndpoint: selectedModel === "openai" ? openaiApiEndpoint : undefined,
            targetLanguage,
            resume: payload
          })
        });

        if (!response.ok) {
          let msg = t("error.generic");
          try {
            const data = await response.json();
            const code = data?.error?.code as string | undefined;
            if (code) {
              const translated = t(`error.${code}`);
              if (translated && !translated.startsWith("translation.error.")) {
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

        const json = (await response.json()) as { result?: RawTranslationResponse };
        const raw = json.result;
        if (!raw) {
          setError(t("error.parse"));
          return false;
        }

        const translation = toResumeTranslation(raw, activeResume.updatedAt);
        const nextTranslations = {
          ...(activeResume.translations ?? {}),
          [targetLanguage]: translation
        };
        updateResume(activeResume.id, { translations: nextTranslations });

        setViewLanguage(activeResume.id, targetLanguage);
        setTranslating(false);
        closePicker();
        toast.success(t("toast.added"));
        return true;
      } catch (e) {
        setError(t("error.generic"));
        return false;
      }
    },
    [
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
      setTranslating,
      setError,
      setViewLanguage,
      closePicker,
      updateResume,
      pushSnapshot,
      t
    ]
  );

  return { translate };
}
