import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  HelpCircle,
  Loader2,
  ChevronDown,
  KeyRound,
  Briefcase,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/compat/client";
import { useRouter } from "@/lib/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useJobMatchStore } from "@/store/useJobMatchStore";
import { useJobMatch } from "@/hooks/useJobMatch";
import {
  computeSectionStates,
  allRequiredFilled,
  type SectionState
} from "@/lib/jobMatch";
import { SectionIcon } from "@/components/editor/layout/SectionIcon";
import { Textarea } from "@/components/ui/textarea";

export function JobMatchEntry() {
  const t = useTranslations("jobMatch");
  const router = useRouter();
  const { activeResume } = useResumeStore();
  const { isConfigured } = useAIConfigStore();
  const {
    expanded,
    toggleExpanded,
    jobDescription,
    setJobDescription,
    isAnalyzing
  } = useJobMatchStore();
  const { run } = useJobMatch();

  const sectionStates = useMemo(
    () => computeSectionStates(activeResume),
    [activeResume]
  );
  const ready = allRequiredFilled(sectionStates);
  const hasJobInput = jobDescription.trim().length >= 30;
  const aiReady = isConfigured();
  const canRun = ready && hasJobInput && aiReady && !isAnalyzing;

  return (
    <div className="rounded-xl border border-brand-orange/20 bg-gradient-to-br from-brand-orange/[0.05] via-card to-brand-purple/[0.04] overflow-hidden">
      {/* Header button — same size as ATS card */}
      <motion.button
        type="button"
        onClick={toggleExpanded}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "w-full text-left p-4 transition-all relative",
          "hover:bg-brand-orange/[0.03]",
          "focus:outline-none focus:ring-2 focus:ring-brand-orange/40 rounded-xl"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orange-soft text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground">
              {t("menuLabel")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {t("menuDescription")}
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="text-brand-orange shrink-0"
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
            className="overflow-hidden border-t border-brand-orange/15"
          >
            <div className="p-4 space-y-4">
              {/* Section readiness list */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  {t("expanded.title")}
                </div>
                <div className="space-y-1.5">
                  {sectionStates.map((s) => (
                    <SectionRow key={s.id} state={s} t={t} />
                  ))}
                </div>
                {!ready && (
                  <p className="text-[11px] text-destructive/80 mt-2 leading-relaxed">
                    {t("expanded.missingRequired")}
                  </p>
                )}
              </div>

              {/* LinkedIn / job description input — disabled until required filled */}
              <div className={cn(!ready && "opacity-50 pointer-events-none")}>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  {t("expanded.linkedinLabel")}
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t("expanded.linkedinPlaceholder")}
                  rows={4}
                  className="resize-none text-xs bg-background border-border/70 focus-visible:ring-brand-orange/30 focus-visible:border-brand-orange/50 mt-1"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1.5 flex items-start gap-1.5">
                  <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-brand-orange/70" />
                  <span>{t("expanded.linkedinHint")}</span>
                </p>
              </div>

              {/* Primary CTA */}
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
                      ? "bg-gradient-to-r from-brand-orange to-brand-orange-soft text-white shadow-md shadow-brand-orange/25 hover:shadow-lg hover:shadow-brand-orange/35 active:scale-[0.98]"
                      : "bg-muted/60 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("dialog.loading")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {t("expanded.primaryCta")}
                      <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              )}

              {!ready ? null : !hasJobInput ? (
                <p className="text-[11px] text-muted-foreground -mt-1 text-center">
                  {t("expanded.missingJobInput")}
                </p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionRow({
  state,
  t
}: {
  state: SectionState;
  t: ReturnType<typeof useTranslations>;
}) {
  const sectionLabel = (() => {
    const key = `sections.${state.id}`;
    const translated = t(key);
    return translated.startsWith("jobMatch.") ? state.id : translated;
  })();

  const { icon, color, label } = (() => {
    switch (state.status) {
      case "filled":
        return {
          icon: <Check className="w-3 h-3" strokeWidth={3} />,
          color:
            "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          label: t("expanded.status.filled")
        };
      case "missingRequired":
        return {
          icon: <X className="w-3 h-3" strokeWidth={3} />,
          color: "bg-destructive/15 text-destructive border-destructive/30",
          label: t("expanded.status.missing")
        };
      case "missingOptional":
      default:
        return {
          icon: <HelpCircle className="w-3 h-3" strokeWidth={2.5} />,
          color:
            "bg-brand-orange-soft/20 text-brand-orange border-brand-orange/30",
          label: t("expanded.status.optionalMissing")
        };
    }
  })();

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors">
      <span
        className={cn(
          "inline-flex w-5 h-5 rounded-full items-center justify-center border",
          color
        )}
        aria-label={label}
        title={label}
      >
        {icon}
      </span>
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-secondary/60 text-muted-foreground shrink-0">
        <SectionIcon id={state.id} className="w-3.5 h-3.5" />
      </span>
      <span className="text-xs text-foreground flex-1 truncate">{sectionLabel}</span>
      <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 shrink-0">
        {state.required
          ? t("expanded.requiredBadge")
          : t("expanded.optionalBadge")}
      </span>
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
    <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <KeyRound className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
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
        className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-brand-orange text-white text-xs font-medium hover:bg-brand-orange/90 transition-colors"
      >
        {cta}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
