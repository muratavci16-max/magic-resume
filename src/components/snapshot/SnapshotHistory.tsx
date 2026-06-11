import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Sparkles,
  Wand2,
  User,
  Languages,
  Download,
  RotateCcw,
  Trash2,
  Clock
} from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { useResumeStore } from "@/store/useResumeStore";
import {
  useSnapshotStore,
  extractSnapshotData,
  type ResumeSnapshot,
  type SnapshotTrigger
} from "@/store/useSnapshotStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SnapshotHistoryProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SnapshotHistory({ open, onOpenChange }: SnapshotHistoryProps) {
  const t = useTranslations("snapshots");
  const { activeResume, updateResume } = useResumeStore();
  const list = useSnapshotStore((s) => s.list(activeResume?.id));
  const push = useSnapshotStore((s) => s.push);
  const remove = useSnapshotStore((s) => s.remove);
  const [pendingRestore, setPendingRestore] = useState<ResumeSnapshot | null>(null);

  const grouped = useMemo(() => groupByDay(list), [list]);

  const handleSnapshotNow = () => {
    if (!activeResume) return;
    const data = extractSnapshotData(activeResume);
    push(activeResume.id, data, "manual", t("triggers.manual"));
    toast.success(t("toast.created"));
  };

  const handleRestore = (snap: ResumeSnapshot) => {
    if (!activeResume) return;
    // Auto-snapshot current state before restoring so the restore itself is undoable.
    push(
      activeResume.id,
      extractSnapshotData(activeResume),
      "manual",
      t("triggers.beforeRestore")
    );
    updateResume(activeResume.id, snap.snapshot);
    setPendingRestore(null);
    toast.success(t("toast.restored"));
  };

  const handleDelete = (snap: ResumeSnapshot) => {
    if (!activeResume) return;
    remove(activeResume.id, snap.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background"
      >
        <SheetHeader className="px-5 py-4 border-b border-border/50 bg-gradient-to-br from-brand-purple/[0.04] via-background to-brand-orange/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-soft text-white flex items-center justify-center shadow-sm shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base font-semibold text-foreground tracking-tight">
                {t("title")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {t("subtitle")}
              </SheetDescription>
            </div>
          </div>

          <Button
            onClick={handleSnapshotNow}
            size="sm"
            className={cn(
              "mt-3 h-9 rounded-lg w-full",
              "bg-brand-purple text-white hover:bg-brand-purple/90",
              "shadow-sm shadow-brand-purple/20"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {t("actions.snapshotNow")}
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            {list.length === 0 ? (
              <EmptyState
                title={t("empty.title")}
                description={t("empty.description")}
              />
            ) : (
              <div className="space-y-5">
                {grouped.map(({ day, items }) => (
                  <div key={day}>
                    <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {day}
                    </div>
                    <div className="space-y-1.5">
                      {items.map((snap) => (
                        <SnapshotRow
                          key={snap.id}
                          snap={snap}
                          onRestore={() => setPendingRestore(snap)}
                          onDelete={() => handleDelete(snap)}
                          restoreLabel={t("actions.restore")}
                          deleteLabel={t("actions.delete")}
                          triggerLabels={{
                            manual: t("triggers.manual"),
                            tailor: t("triggers.tailor"),
                            polish: t("triggers.polish"),
                            translate: t("triggers.translate"),
                            import: t("triggers.import")
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <AnimatePresence>
          {pendingRestore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4 z-50"
              onClick={() => setPendingRestore(null)}
            >
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-background border border-border/60 shadow-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-3">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">
                  {t("restoreDialog.title")}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {t("restoreDialog.body")}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setPendingRestore(null)}
                    className="flex-1 rounded-lg"
                  >
                    {t("restoreDialog.cancel")}
                  </Button>
                  <Button
                    onClick={() => handleRestore(pendingRestore)}
                    className="flex-1 rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    {t("restoreDialog.confirm")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function SnapshotRow({
  snap,
  onRestore,
  onDelete,
  restoreLabel,
  deleteLabel,
  triggerLabels
}: {
  snap: ResumeSnapshot;
  onRestore: () => void;
  onDelete: () => void;
  restoreLabel: string;
  deleteLabel: string;
  triggerLabels: Record<SnapshotTrigger, string>;
}) {
  const Icon = iconFor(snap.trigger);
  const colors = colorsFor(snap.trigger);
  const time = new Date(snap.createdAt);
  const timeStr = time.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
  const relative = relativeTime(snap.createdAt);

  return (
    <div className="group p-3 rounded-lg border border-transparent hover:border-border/50 hover:bg-secondary/40 transition-all">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
            colors
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {snap.label || triggerLabels[snap.trigger]}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>{relative}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono">{timeStr}</span>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            title={deleteLabel}
            className="w-7 h-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRestore}
            title={restoreLabel}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-brand-purple text-white text-[11px] font-medium hover:bg-brand-purple/90"
          >
            <RotateCcw className="w-3 h-3" />
            {restoreLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center mx-2">
      <div className="mx-auto w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-3">
        <History className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <div className="font-medium text-sm text-foreground mb-1">{title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function iconFor(trigger: SnapshotTrigger) {
  switch (trigger) {
    case "tailor":
      return Sparkles;
    case "polish":
      return Wand2;
    case "translate":
      return Languages;
    case "import":
      return Download;
    case "manual":
    default:
      return User;
  }
}

function colorsFor(trigger: SnapshotTrigger): string {
  switch (trigger) {
    case "tailor":
      return "bg-brand-orange/10 text-brand-orange";
    case "polish":
      return "bg-brand-purple/10 text-brand-purple";
    case "translate":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "import":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "manual":
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function groupByDay(list: ResumeSnapshot[]): { day: string; items: ResumeSnapshot[] }[] {
  const groups = new Map<string, ResumeSnapshot[]>();
  const today = startOfDay(Date.now());
  const yesterday = today - 86_400_000;

  for (const snap of list) {
    const ts = startOfDay(snap.createdAt);
    let key: string;
    if (ts === today) key = "Today";
    else if (ts === yesterday) key = "Yesterday";
    else {
      const d = new Date(snap.createdAt);
      key = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: ts > startOfDay(Date.now()) - 365 * 86_400_000 ? undefined : "numeric"
      });
    }
    const arr = groups.get(key) ?? [];
    arr.push(snap);
    groups.set(key, arr);
  }

  return Array.from(groups.entries()).map(([day, items]) => ({ day, items }));
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
