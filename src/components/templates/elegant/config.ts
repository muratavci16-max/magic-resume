import { ResumeTemplate } from "@/types/template";

export const elegantConfig: ResumeTemplate = {
  id: "elegant",
  name: "Elegant",
  description: "Centered title single-column design, with a touch of elegance",
  thumbnail: "elegant",
  layout: "elegant",
  colorScheme: {
    primary: "#18181b",
    secondary: "#71717a",
    background: "#ffffff",
    text: "#27272a",
  },
  spacing: {
    sectionGap: 28,
    itemGap: 18,
    contentPadding: 32,
  },
  basic: {
    layout: "center",
  },
  availableSections: ["skills", "experience", "projects", "education", "selfEvaluation", "certificates"],
};
