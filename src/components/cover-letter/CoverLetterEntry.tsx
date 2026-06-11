import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Loader2,
  Briefcase,
  KeyRound,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/compat/client";
import { useRouter } from "@/lib/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useJobMatchStore } from "@/store/useJobMatchStore";
import { useCoverLetterStore } from "@/store/useCoverLetterStore";
import { useCoverLetter } from "@/hooks/useCoverLetter";

const TONES = ["formal", "friendly", "confident"] as const;
const LENGTHS = ["short", "medium", "long"] as const;

export function CoverLetterEntry() {
  const t = useTranslations("coverLetter");
  const router = useRouter();
  const { activeResume } = useResumeStore();
  const { isConfigured } = useAIConfigStore();
  const { jobDescription } = useJobMatchStore();
  const {
    expanded,
    toggleExpanded,
    tone,
    length,
    setTone,
    setLength,
    isGenerating,
    list
  } = useCoverLetterStore();
  const { run } = useCoverLetter();
  const saved = list(activeResume?.id);

  const aiReady = isConfigured();
  const hasJobInput = jobDescription.trim().length >= 30;
  const canRun = aiReady && hasJobInput && !isGenerating;

  return (
    <div className="rounded-xl border border-brand-purple-soft/25 bg-gradient-to-br from-brand-purple-soft/[0.05] via-card to-brand-purple/[0.03] overflow-hidden">
      <motion.button
        type="button"
        onClick={toggleExpanded}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "w-full text-left p-4 transition-all relative",
          "hover:bg-brand-purple-soft/[0.04]",
          "focus:outline-none focus:ring-2 focus:ring-brand-purple-soft/40 rounded-xl"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-purple-soft text-white flex items-center justify-center shadow-sm">
            <Mail className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground flex items-center gap-2">
              {t("menuLabel")}
              {saved.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-purple-soft/15 text-brand-purple-soft">
                  {saved.length}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {t("menuDescription")}
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="text-brand-purple-soft shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-brand-purple-soft/15"
          >
            <div className="p-4 space-y-4">
              {/* Job description status */}
              <div className="rounded-lg border border-border/50 bg-background/60 p-3 flex items-start gap-2.5">
                <Briefcase className="w-3.5 h-3.5 text-brand-purple-soft mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {hasJobInput
                      ? t("jobInputProvided")
                      : t("jobInputMissingTitle")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {hasJobInput
                      ? t("jobInputProvidedHint")
                      : t("jobInputMissingHint")}
                  </p>
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  {t("toneLabel")}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TONES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTone(option)}
                      className={cn(
                        "rounded-lg text-xs font-medium py-2 border transition-all",
                        tone === option
                          ? "bg-brand-purple-soft text-white border-brand-purple-soft shadow-sm shadow-brand-purple-soft/20"
                          : "bg-background text-muted-foreground border-border/60 hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      {t(`tones.${option}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length selector */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  {t("lengthLabel")}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {LENGTHS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLength(option)}
                      className={cn(
                        "rounded-lg text-xs font-medium py-2 border transition-all",
                        length === option
                          ? "bg-brand-purple-soft text-white border-brand-purple-soft shadow-sm shadow-brand-purple-soft/20"
                          : "bg-background text-muted-foreground border-border/60 hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      {t(`lengths.${option}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI gate / CTA */}
              {!aiReady ? (
                <MissingAINotice
                  title={t("missingConfig.title")}
                  description={t("missingConfig.description")}
                  cta={t("missingConfig.cta")}
                  onCta={() => router.push("/app/dashboard/ai")}
                />
              ) : (
                <button
                  type="button"
                  disabled={!canRun}
                  onClick={run}
                  className={cn(
                    "group w-full rounded-xl h-11 px-4 text-sm font-medium",
                    "inline-flex items-center justify-center gap-2",
                    "transition-all duration-200",
                    canRun
                      ? "bg-brand-purple-soft text-white shadow-md shadow-brand-purple-soft/20 hover:bg-brand-purple-soft/95 hover:shadow-lg hover:shadow-brand-purple-soft/30 active:scale-[0.98]"
                      : "bg-muted/60 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("generating")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {t("generateCta")}
                      <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              )}

              {/* Saved letters list */}
              {saved.length > 0 && <SavedLettersList />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SavedLettersList() {
  const t = useTranslations("coverLetter");
  const { activeResume } = useResumeStore();
  const { list, remove, setDraft, openDialog } = useCoverLetterStore();
  const items = list(activeResume?.id);

  return (
    <div className="border-t border-border/40 pt-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        {t("savedTitle")}
      </div>
      <div className="space-y-1.5">
        {items.map((letter) => (
          <button
            key={letter.id}
            type="button"
            onClick={() => {
              setDraft(letter);
              openDialog();
            }}
            className="group w-full text-left rounded-lg p-2.5 border border-border/40 bg-background/60 hover:border-brand-purple-soft/40 hover:bg-brand-purple-soft/[0.03] transition-all"
          >
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-md bg-brand-purple-soft/10 text-brand-purple-soft flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {letter.subject || t("untitled")}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>{t(`tones.${letter.tone}`)}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{t(`lengths.${letter.length}`)}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MissingAINotice({
  title,
  description,
  cta,
  onCta
}: {
  title: string;
  description: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand-purple-soft/30 bg-brand-purple-soft/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <KeyRound className="w-4 h-4 text-brand-purple-soft shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-foreground">{title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-brand-purple-soft text-white text-xs font-medium hover:bg-brand-purple-soft/90 transition-colors"
      >
        {cta}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
