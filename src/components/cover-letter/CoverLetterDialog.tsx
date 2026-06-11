import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Sparkles,
  Loader2,
  Copy,
  Save,
  RotateCw,
  AlertCircle,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/compat/client";
import { useResumeStore } from "@/store/useResumeStore";
import { useCoverLetterStore } from "@/store/useCoverLetterStore";
import { useCoverLetter } from "@/hooks/useCoverLetter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CoverLetterDialog() {
  const t = useTranslations("coverLetter.dialog");
  const tTones = useTranslations("coverLetter.tones");
  const tLens = useTranslations("coverLetter.lengths");
  const { activeResume } = useResumeStore();
  const {
    dialogOpen,
    closeDialog,
    isGenerating,
    error,
    draft,
    saveDraft
  } = useCoverLetterStore();
  const { run } = useCoverLetter();
  const bodyRef = useRef<HTMLDivElement>(null);

  const copyAll = async () => {
    if (!draft) return;
    const text = renderToPlainText(draft);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("toast.copied"));
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  };

  const downloadTxt = () => {
    if (!draft) return;
    const text = renderToPlainText(draft);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeSubject = (draft.subject || "cover-letter")
      .replace(/[^\wÀ-ſğşı\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "cover-letter";
    a.download = `${safeSubject}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!activeResume?.id || !draft) return;
    saveDraft(activeResume.id);
    toast.success(t("toast.saved"));
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent
        className={cn(
          "sm:max-w-[820px] max-h-[92vh] p-0 overflow-hidden flex flex-col",
          "bg-background border-border/60 rounded-2xl shadow-2xl"
        )}
        onPointerDownOutside={(e) => isGenerating && e.preventDefault()}
        onEscapeKeyDown={(e) => isGenerating && e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/50 bg-gradient-to-br from-brand-purple-soft/[0.05] via-background to-brand-purple/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple-soft text-white flex items-center justify-center shadow-sm shrink-0">
              <Mail className="w-5 h-5" />
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
          {draft && !isGenerating && !error && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple-soft/10 border border-brand-purple-soft/20 text-[11px] text-brand-purple-soft font-medium">
                <Sparkles className="w-3 h-3" />
                {tTones(draft.tone)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 border border-border/40 text-[11px] text-muted-foreground font-medium">
                {tLens(draft.length)}
              </span>
              {draft.language && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 border border-border/40 text-[11px] text-muted-foreground font-mono uppercase">
                  {draft.language}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isGenerating ? (
            <LoadingState
              label={t("loading")}
              hint={t("loadingHint")}
            />
          ) : error ? (
            <ErrorState
              message={error}
              retryLabel={t("actions.regenerate")}
              onRetry={run}
              onClose={closeDialog}
              closeLabel={t("actions.close")}
            />
          ) : draft ? (
            <LetterBody draft={draft} bodyRef={bodyRef} />
          ) : (
            <LoadingState label={t("loading")} hint={t("loadingHint")} />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-background/95 backdrop-blur-sm flex flex-row items-center sm:items-center sm:justify-end gap-2">
          {draft && !isGenerating && !error && (
            <>
              <Button
                variant="ghost"
                onClick={copyAll}
                className="rounded-lg"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                {t("actions.copy")}
              </Button>
              <Button
                variant="outline"
                onClick={downloadTxt}
                className="rounded-lg"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {t("actions.downloadTxt")}
              </Button>
              <Button
                variant="outline"
                onClick={run}
                className="rounded-lg"
              >
                <RotateCw className="w-4 h-4 mr-1.5" />
                {t("actions.regenerate")}
              </Button>
              <Button
                onClick={handleSave}
                className={cn(
                  "rounded-lg h-10 px-5 font-medium",
                  "bg-brand-purple-soft text-white",
                  "shadow-md shadow-brand-purple-soft/25 hover:bg-brand-purple-soft/95"
                )}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {t("actions.save")}
              </Button>
            </>
          )}
          {(isGenerating || error || !draft) && (
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={isGenerating}
              className="rounded-lg"
            >
              {t("actions.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LetterBody({
  draft,
  bodyRef
}: {
  draft: NonNullable<ReturnType<typeof useCoverLetterStore>["draft"]>;
  bodyRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-7 md:p-9 shadow-sm"
    >
      {draft.subject && (
        <div className="mb-5 pb-4 border-b border-border/40">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Subject
          </div>
          <div className="text-sm font-medium text-foreground">{draft.subject}</div>
        </div>
      )}
      <div
        ref={bodyRef}
        className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90 prose-p:my-3 font-serif"
      >
        {draft.greeting && <p className="font-sans not-italic">{draft.greeting}</p>}
        <div
          className="font-sans"
          dangerouslySetInnerHTML={{ __html: draft.body }}
        />
        {draft.closing && (
          <p className="mt-6 font-sans">
            {draft.closing}
            <br />
            <span className="font-semibold">{draft.signature}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

function LoadingState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative w-14 h-14 mb-5">
        <div className="absolute inset-0 rounded-full bg-brand-purple-soft opacity-20 blur-xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-full bg-brand-purple-soft flex items-center justify-center text-white shadow-lg">
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
  onRetry,
  onClose,
  closeLabel
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-sm text-foreground mb-5 max-w-md leading-relaxed">{message}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onClose} className="rounded-lg">
          {closeLabel}
        </Button>
        <Button
          onClick={onRetry}
          className="rounded-lg bg-brand-purple-soft text-white hover:bg-brand-purple-soft/90"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

function renderToPlainText(d: {
  subject?: string;
  greeting?: string;
  body?: string;
  closing?: string;
  signature?: string;
}): string {
  const lines: string[] = [];
  if (d.subject) {
    lines.push(`Subject: ${d.subject}`);
    lines.push("");
  }
  if (d.greeting) {
    lines.push(d.greeting);
    lines.push("");
  }
  if (d.body) {
    // crude HTML → text
    const text = d.body
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    lines.push(text);
    lines.push("");
  }
  if (d.closing) {
    lines.push(d.closing);
    if (d.signature) lines.push(d.signature);
  }
  return lines.join("\n");
}
