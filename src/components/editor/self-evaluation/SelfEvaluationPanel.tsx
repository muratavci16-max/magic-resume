import { useResumeStore } from "@/store/useResumeStore";
import { useTranslations } from "@/i18n/compat/client";
import { cn } from "@/lib/utils";
import Field from "../Field";

const SelfEvaluationPanel = () => {
    const { activeResume, updateSelfEvaluationContent } = useResumeStore();
    const selfEvaluationContent = activeResume?.selfEvaluationContent ?? "";
    const t = useTranslations("workbench.selfEvaluationPanel");
    const handleChange = (value: string) => {
        updateSelfEvaluationContent(value);
    };

    return (
        <div
            className={cn(
                "rounded-lg border p-4",
                "bg-card",
                "border-border"
            )}
        >
            <Field
                value={selfEvaluationContent}
                onChange={handleChange}
                type="editor"
                placeholder={t("placeholder")}
            />
        </div>
    );
};

export default SelfEvaluationPanel;
