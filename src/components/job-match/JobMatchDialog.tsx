import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCw,
  AlertCircle,
  ShieldCheck,
  Target,
  Briefcase
} from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { useResumeStore } from "@/store/useResumeStore";
import {
  useJobMatchStore,
  proposalKey,
  type ProposalState
} from "@/store/useJobMatchStore";
import { useJobMatch, useApplyJobMatch } from "@/hooks/useJobMatch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import TurndownService from "turndown";
import { SectionIcon } from "@/components/editor/layout/SectionIcon";
import { cn } from "@/lib/utils";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

interface SectionRowSpec {
  key: string;
  sectionId: string;
  itemId?: string;
  label: string;
  context?: string; // e.g. "Trendyol — Senior Engineer (2023–Present)"
  original: string;
  proposal?: ProposalState;
}

export function JobMatchDialog() {
  const t = useTranslations("jobMatch.dialog");
  const tSections = useTranslations("jobMatch.sections");
  const { activeResume } = useResumeStore();
  const {
    dialogOpen,
    closeDialog,
    isAnalyzing,
    error,
    result,
    proposals,
    setProposalStatus,
    acceptAllPending,
    jobInputSource
  } = useJobMatchStore();
  const tSource = useTranslations("jobMatch.sourceBadge");
  const { run } = useJobMatch();
  const apply = useApplyJobMatch();

  const sectionLabel = (id: string) => {
    const v = tSections(id);
    return v.startsWith("jobMatch.sections.") ? id : v;
  };

  const rows: SectionRowSpec[] = useMemo(() => {
    if (!activeResume || !result) return [];

    const out: SectionRowSpec[] = [];

    // Summary
    if (proposals[proposalKey("selfEvaluation")]) {
      out.push({
        key: proposalKey("selfEvaluation"),
        sectionId: "selfEvaluation",
        label: sectionLabel("selfEvaluation"),
        original: activeResume.selfEvaluationContent ?? "",
        proposal: proposals[proposalKey("selfEvaluation")]
      });
    }

    // Experience items
    for (const e of activeResume.experience ?? []) {
      const k = proposalKey("experience", e.id);
      if (!proposals[k]) continue;
      out.push({
        key: k,
        sectionId: "experience",
        itemId: e.id,
        label: sectionLabel("experience"),
        context: [e.position, e.company, e.date].filter(Boolean).join(" · "),
        original: e.details ?? "",
        proposal: proposals[k]
      });
    }

    // Skills
    if (proposals[proposalKey("skills")]) {
      out.push({
        key: proposalKey("skills"),
        sectionId: "skills",
        label: sectionLabel("skills"),
        original: activeResume.skillContent ?? "",
        proposal: proposals[proposalKey("skills")]
      });
    }

    // Projects
    for (const p of activeResume.projects ?? []) {
      const k = proposalKey("projects", p.id);
      if (!proposals[k]) continue;
      out.push({
        key: k,
        sectionId: "projects",
        itemId: p.id,
        label: sectionLabel("projects"),
        context: [p.name, p.role, p.date].filter(Boolean).join(" · "),
        original: p.description ?? "",
        proposal: proposals[k]
      });
    }

    // Education
    for (const ed of activeResume.education ?? []) {
      const k = proposalKey("education", ed.id);
      if (!proposals[k]) continue;
      out.push({
        key: k,
        sectionId: "education",
        itemId: ed.id,
        label: sectionLabel("education"),
        context: [ed.degree, ed.major, ed.school].filter(Boolean).join(" · "),
        original: ed.description ?? "",
        proposal: proposals[k]
      });
    }

    return out;
  }, [activeResume, result, proposals]);

  const pendingCount = useMemo(
    () =>
      Object.values(proposals).filter((p) => p.status === "pending").length,
    [proposals]
  );
  const acceptedCount = useMemo(
    () =>
      Object.values(proposals).filter((p) => p.status === "accepted").length,
    [proposals]
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent
        className={cn(
          "sm:max-w-[1100px] max-h-[92vh] p-0 overflow-hidden flex flex-col",
          "bg-background border-border/60 rounded-2xl shadow-2xl"
        )}
        onPointerDownOutside={(e) => isAnalyzing && e.preventDefault()}
        onEscapeKeyDown={(e) => isAnalyzing && e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/50 bg-gradient-to-br from-brand-orange/[0.04] via-background to-brand-purple/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-soft text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-serif font-semibold text-foreground tracking-tight">
                {t("title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                {t("subtitle")}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              {t("preservedNotice")}
            </span>
            {result && jobInputSource && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-[11px] text-brand-purple font-medium">
                <Briefcase className="w-3 h-3" />
                {tSource(jobInputSource)}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isAnalyzing ? (
            <LoadingState
              label={t("loading")}
              hint={t("loadingHint")}
            />
          ) : error ? (
            <ErrorState
              message={error}
              retryLabel={t("actions.regenerate")}
              onRetry={run}
            />
          ) : !result ? (
            <LoadingState label={t("loading")} hint={t("loadingHint")} />
          ) : (
            <div className="space-y-5">
              {/* Job summary card */}
              <JobSummaryCard
                summaryLabel={t("jobSummaryTitle")}
                emptyLabel={t("jobSummaryEmpty")}
                keyReqLabel={t("keyRequirementsTitle")}
                softSkillsLabel={t("softSkillsTitle")}
                summary={result.jobSummary}
              />

              {/* Section proposals */}
              <div className="space-y-4">
                {rows.map((row) => (
                  <SectionProposalCard
                    key={row.key}
                    row={row}
                    labels={{
                      original: t("originalLabel"),
                      proposed: t("proposedLabel"),
                      rationale: t("rationaleLabel"),
                      accept: t("actions.accept"),
                      reject: t("actions.reject"),
                      accepted: t("actions.accepted"),
                      rejected: t("actions.rejected"),
                      noProposal: t("noProposal")
                    }}
                    onAccept={() =>
                      setProposalStatus(row.key, "accepted")
                    }
                    onReject={() =>
                      setProposalStatus(row.key, "rejected")
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-background/95 backdrop-blur-sm flex flex-row items-center sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {result && !isAnalyzing && (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {acceptedCount}
                </span>{" "}
                accepted
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="text-foreground">{pendingCount}</span> pending
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={isAnalyzing}
              className="rounded-lg"
            >
              {t("actions.close")}
            </Button>
            {result && !isAnalyzing && !error && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    acceptAllPending();
                  }}
                  className="rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {t("actions.applyAllPending")}
                </Button>
                <Button
                  onClick={apply}
                  disabled={acceptedCount === 0}
                  className={cn(
                    "rounded-lg h-10 px-5 font-medium",
                    "bg-gradient-to-r from-brand-orange to-brand-orange-soft text-white",
                    "shadow-md shadow-brand-orange/25 hover:shadow-lg hover:shadow-brand-orange/35",
                    "disabled:bg-muted disabled:text-muted-foreground disabled:bg-none disabled:shadow-none"
                  )}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {t("actions.applyAll")} ({acceptedCount})
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobSummaryCard({
  summaryLabel,
  emptyLabel,
  keyReqLabel,
  softSkillsLabel,
  summary
}: {
  summaryLabel: string;
  emptyLabel: string;
  keyReqLabel: string;
  softSkillsLabel: string;
  summary: { title?: string; company?: string; summary?: string; keyRequirements?: string[]; softSkills?: string[] };
}) {
  return (
    <div className="rounded-2xl border border-brand-purple/15 bg-gradient-to-br from-brand-purple/[0.03] via-card to-card p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-brand-purple font-semibold mb-2">
        <Briefcase className="w-3 h-3" />
        {summaryLabel}
      </div>
      {summary.title || summary.company ? (
        <div className="mb-3">
          <div className="text-base font-semibold text-foreground">
            {summary.title || "—"}
          </div>
          {summary.company && (
            <div className="text-sm text-muted-foreground">{summary.company}</div>
          )}
        </div>
      ) : null}
      <p className="text-sm text-foreground/85 leading-relaxed">
        {summary.summary || (
          <span className="text-muted-foreground italic">{emptyLabel}</span>
        )}
      </p>

      {summary.keyRequirements && summary.keyRequirements.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            {keyReqLabel}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.keyRequirements.map((r, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md bg-brand-purple/10 text-brand-purple text-xs font-medium border border-brand-purple/15"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.softSkills && summary.softSkills.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            {softSkillsLabel}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.softSkills.map((r, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md bg-secondary/70 text-foreground/80 text-xs font-medium border border-border/40"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionProposalCard({
  row,
  labels,
  onAccept,
  onReject
}: {
  row: SectionRowSpec;
  labels: {
    original: string;
    proposed: string;
    rationale: string;
    accept: string;
    reject: string;
    accepted: string;
    rejected: string;
    noProposal: string;
  };
  onAccept: () => void;
  onReject: () => void;
}) {
  const status = row.proposal?.status ?? "pending";
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";

  const originalMd = useMemo(() => toMd(row.original), [row.original]);
  const proposedMd = useMemo(
    () => (row.proposal?.proposed ? toMd(row.proposal.proposed) : ""),
    [row.proposal?.proposed]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-2xl border bg-card transition-colors",
        isAccepted
          ? "border-emerald-500/30 bg-emerald-500/[0.02]"
          : isRejected
          ? "border-destructive/20 bg-destructive/[0.02] opacity-70"
          : "border-border/60"
      )}
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-brand-purple/10 text-brand-purple shrink-0">
          <SectionIcon id={row.sectionId} className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-none">
            {row.label}
          </div>
          {row.context && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {row.context}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {status === "accepted" && (
            <StatusBadge key="ok" variant="ok" label={labels.accepted} />
          )}
          {status === "rejected" && (
            <StatusBadge key="no" variant="no" label={labels.rejected} />
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-border/40">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            {labels.original}
          </div>
          <div className="prose dark:prose-invert max-w-none text-sm text-foreground/80 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
            <Streamdown>{originalMd || "—"}</Streamdown>
          </div>
        </div>
        <div className="p-5 bg-gradient-to-br from-brand-orange/[0.03] to-transparent">
          <div className="text-[10px] uppercase tracking-wider text-brand-orange font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {labels.proposed}
          </div>
          {proposedMd ? (
            <div className="prose dark:prose-invert max-w-none text-sm text-foreground prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-foreground">
              <Streamdown animated isAnimating={status === "pending"}>
                {proposedMd}
              </Streamdown>
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">{labels.noProposal}</p>
          )}

          {row.proposal?.rationale && (
            <div className="mt-3 text-[11px] text-muted-foreground/90 leading-relaxed pt-2 border-t border-brand-orange/10">
              <span className="font-semibold text-brand-orange/80 mr-1">
                {labels.rationale}:
              </span>
              {row.proposal.rationale}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 flex items-center justify-end gap-2 border-t border-border/40">
        <Button
          size="sm"
          variant="ghost"
          onClick={onReject}
          disabled={isRejected}
          className={cn(
            "rounded-lg text-xs",
            isRejected && "text-destructive"
          )}
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          {labels.reject}
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isAccepted || !proposedMd}
          className={cn(
            "rounded-lg h-8 text-xs font-medium",
            isAccepted
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "bg-emerald-500 text-white hover:bg-emerald-500/90"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          {labels.accept}
        </Button>
      </div>
    </motion.div>
  );
}

function StatusBadge({
  variant,
  label
}: {
  variant: "ok" | "no";
  label: string;
}) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={cn(
        "text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1",
        variant === "ok"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
          : "bg-destructive/10 text-destructive border border-destructive/30"
      )}
    >
      {variant === "ok" ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {label}
    </motion.span>
  );
}

function LoadingState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative w-14 h-14 mb-5">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-purple to-brand-orange opacity-20 blur-xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center text-white shadow-lg">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1.5">{label}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{hint}</p>
    </div>
  );
}

function ErrorState({
  message,
  retryLabel,
  onRetry
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  const { closeDialog } = useJobMatchStore();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-sm text-foreground mb-5 max-w-md leading-relaxed">{message}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={closeDialog}
          className="rounded-lg"
        >
          Edit description
        </Button>
        <Button onClick={onRetry} className="rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90">
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

function toMd(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html;
  try {
    return turndown.turndown(html);
  } catch {
    return html.replace(/<[^>]+>/g, "");
  }
}
