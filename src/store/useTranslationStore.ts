import { create } from "zustand";
import { persist } from "zustand/middleware";

// Per-resume "which language is currently being viewed in the preview". This
// is preview-only state — the editor always edits the source content. We
// persist so the picked language survives a refresh.
interface TranslationState {
  viewLanguageByResume: Record<string, string>;
  isTranslating: boolean;
  error: string | null;
  pickerOpen: boolean;

  setViewLanguage: (resumeId: string, lang: string) => void;
  getViewLanguage: (resumeId: string | undefined | null) => string | null;
  setTranslating: (v: boolean) => void;
  setError: (msg: string | null) => void;
  openPicker: () => void;
  closePicker: () => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
      viewLanguageByResume: {},
      isTranslating: false,
      error: null,
      pickerOpen: false,

      setViewLanguage: (resumeId, lang) =>
        set((s) => ({
          viewLanguageByResume: { ...s.viewLanguageByResume, [resumeId]: lang }
        })),
      getViewLanguage: (resumeId) =>
        resumeId ? get().viewLanguageByResume[resumeId] ?? null : null,
      setTranslating: (v) => set({ isTranslating: v, error: v ? null : get().error }),
      setError: (msg) => set({ error: msg, isTranslating: false }),
      openPicker: () => set({ pickerOpen: true }),
      closePicker: () => set({ pickerOpen: false })
    }),
    {
      name: "halname-translation-view",
      partialize: (s) => ({ viewLanguageByResume: s.viewLanguageByResume })
    }
  )
);

// All languages we offer in the picker. Keep ordering deliberate.
export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: string; label: string; emoji?: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" }
];
