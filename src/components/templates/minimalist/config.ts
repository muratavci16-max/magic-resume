import { ResumeTemplate } from "@/types/template";

export const minimalistConfig: ResumeTemplate = {
  id: "minimalist",
  name: "Minimalist",
  description: "Large amount of whitespace, clean and pure layout style",
  thumbnail: "minimalist",
  layout: "minimalist",
  colorScheme: {
    primary: "#171717",
    secondary: "#737373",
    background: "#ffffff",
    text: "#171717",
  },
  spacing: {
    sectionGap: 32,
    itemGap: 24,
    contentPadding: 40,
  },
  basic: {
    layout: "center",
  },
  availableSections: ["skills", "experience", "projects", "education", "selfEvaluation", "certificates"],
};
