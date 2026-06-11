import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Languages,
  Plus,
  Check,
  RefreshCw,
  Loader2,
  Sparkles,
  AlertCircle,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/compat/client";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import {
  useTranslationStore,
  SUPPORTED_LANGUAGES
} from "@/store/useTranslationStore";
import { useTranslate } from "@/hooks/useTranslate";
import { isTranslationStale } from "@/lib/applyTranslation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SOURCE_LABEL_CODE = "source";

export function LanguagePicker() {
  const t = useTranslations("translation");
  const { activeResume, updateResume } = useResumeStore();
  const { isConfigured } = useAIConfigStore();
  const {
    isTranslating,
    error,
    pickerOpen,
    openPicker,
    closePicker,
    setViewLanguage,
    getViewLanguage,
    setError
  } = useTranslationStore();
  const { translate } = useTranslate();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const current = getViewLanguage(activeResume?.id);
  const aiReady = isConfigured();

  const cachedLanguages = useMemo(() => {
    if (!activeResume?.translations) return [];
    return Object.keys(activeResume.translations);
  }, [activeResume?.translations]);

  const sourceLabel = t("sourceBadge");

  if (!activeResume) return null;

  return (
    <>
      <Popover
        open={pickerOpen}
        onOpenChange={(o) => (o ? openPicker() : closePicker())}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full",
              "bg-background/95 border border-border/60",
              "shadow-sm hover:shadow-md",
              "text-xs font-medium text-foreground",
              "hover:bg-secondary/80 transition-all",
              "backdrop-blur-md"
            )}
            title={t("pickerTooltip")}
          >
            <Languages className="w-3.5 h-3.5 text-brand-purple" />
            <span className="uppercase font-mono tracking-wider">
              {current ?? "TR"}
            </span>
            {isTranslating && (
              <Loader2 className="w-3 h-3 animate-spin text-brand-purple" />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-72 p-2 rounded-xl"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("pickerHeader")}
          </div>

          {/* Source row */}
          <button
            type="button"
            onClick={() => {
              setViewLanguage(activeResume.id, SOURCE_LABEL_CODE);
              closePicker();
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors",
              !current || current === SOURCE_LABEL_CODE
                ? "bg-brand-purple/10 text-brand-purple"
                : "hover:bg-secondary/60 text-foreground"
            )}
          >
            <span className="w-7 h-7 rounded-md bg-brand-purple/10 text-brand-purple flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight">{sourceLabel}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t("sourceHint")}
              </div>
            </div>
            {(!current || current === SOURCE_LABEL_CODE) && (
              <Check className="w-4 h-4 shrink-0" />
            )}
          </button>

          {/* Cached translations */}
          {cachedLanguages.length > 0 && (
            <div className="mt-1 border-t border-border/40 pt-1">
              {cachedLanguages.map((code) => {
                const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === code);
                const tr = activeResume.translations?.[code];
                const stale = isTranslationStale(activeResume, code);
                return (
                  <div
                    key={code}
                    className={cn(
                      "group flex items-center gap-1.5 px-1 py-0.5",
                      current === code && "bg-brand-purple/5 rounded-lg"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setViewLanguage(activeResume.id, code);
                        closePicker();
                      }}
                      className={cn(
                        "flex-1 text-left px-2 py-1.5 rounded-md flex items-center gap-2.5 transition-colors",
                        current === code
                          ? "text-brand-purple"
                          : "hover:bg-secondary/60 text-foreground"
                      )}
                    >
                      <span className="w-7 h-7 rounded-md bg-secondary/70 text-foreground/70 flex items-center justify-center shrink-0 font-mono text-[10px] font-semibold uppercase">
                        {code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight truncate">
                          {langMeta?.label ?? code}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          {stale ? (
                            <>
                              <AlertCircle className="w-2.5 h-2.5 text-brand-orange" />
                              <span className="text-brand-orange">
                                {t("stale")}
                              </span>
                            </>
                          ) : (
                            <span>{t("upToDate")}</span>
                          )}
                        </div>
                      </div>
                      {current === code && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await translate(code);
                      }}
                      title={t("refresh")}
                      className="w-7 h-7 rounded-md text-muted-foreground hover:text-brand-purple hover:bg-brand-purple/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...(activeResume.translations ?? {}) };
                        delete next[code];
                        updateResume(activeResume.id, { translations: next });
                        if (current === code) {
                          setViewLanguage(activeResume.id, SOURCE_LABEL_CODE);
                        }
                        toast.success(t("toast.removed"));
                      }}
                      title={t("remove")}
                      className="w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add language */}
          <div className="mt-1 border-t border-border/40 pt-1">
            <button
              type="button"
              onClick={() => {
                closePicker();
                setShowAddDialog(true);
                setError(null);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors",
                "hover:bg-brand-purple/5 text-brand-purple"
              )}
            >
              <span className="w-7 h-7 rounded-md bg-brand-purple text-white flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium leading-tight">{t("addLanguage")}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {aiReady ? t("addHint") : t("error.configRequired")}
                </div>
              </div>
            </button>
          </div>

          {error && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-[11px] leading-relaxed flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AddLanguageDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        cachedCodes={cachedLanguages}
        aiReady={aiReady}
      />
    </>
  );
}

function AddLanguageDialog({
  open,
  onClose,
  cachedCodes,
  aiReady
}: {
  open: boolean;
  onClose: () => void;
  cachedCodes: string[];
  aiReady: boolean;
}) {
  const t = useTranslations("translation");
  const { isTranslating } = useTranslationStore();
  const { translate } = useTranslate();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isTranslating && onClose()}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border/40 bg-gradient-to-br from-brand-purple/[0.04] via-background to-brand-orange/[0.03]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-soft text-white flex items-center justify-center shrink-0">
                  <Languages className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {t("addDialog.title")}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {t("addDialog.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const already = cachedCodes.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={!aiReady || isTranslating || already}
                      onClick={async () => {
                        const ok = await translate(lang.code);
                        if (ok) onClose();
                      }}
                      className={cn(
                        "rounded-xl p-3 border text-left transition-all",
                        "flex items-center gap-2.5",
                        already
                          ? "bg-emerald-500/5 border-emerald-500/20 text-foreground cursor-default"
                          : "bg-background border-border/60 hover:border-brand-purple/40 hover:bg-brand-purple/[0.03]",
                        (!aiReady || isTranslating) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center font-mono text-[10px] font-bold uppercase shrink-0",
                        already
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-secondary/70 text-muted-foreground"
                      )}>
                        {lang.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {lang.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {already ? t("addDialog.alreadyAdded") : t("addDialog.add")}
                        </div>
                      </div>
                      {already && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {isTranslating && (
              <div className="px-5 py-3 border-t border-border/40 bg-brand-purple/[0.03] flex items-center gap-2 text-xs text-brand-purple">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("addDialog.translating")}</span>
              </div>
            )}

            <div className="px-5 py-3 border-t border-border/40 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isTranslating}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {t("addDialog.close")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
