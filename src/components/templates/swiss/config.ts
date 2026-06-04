import { ResumeTemplate } from "@/types/template";

export const swissConfig: ResumeTemplate = {
  id: "swiss",
  name: "Swiss Aesthetic",
  description: "Artistic Bauhaus layout with strong typographic hierarchy and geometric accents, showing modern minimalism",
  thumbnail: "swiss",
  layout: "swiss",
  colorScheme: {
    primary: "#0f172a",
    secondary: "#64748b",
    background: "#ffffff",
    text: "#0f172a",
  },
  spacing: {
    sectionGap: 36,
    itemGap: 20,
    contentPadding: 36,
  },
  basic: {
    layout: "left",
  },
  availableSections: ["skills", "experience", "projects", "education", "selfEvaluation", "certificates"],
};
