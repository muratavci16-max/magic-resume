import type { LucideIcon } from "lucide-react";
import {
  User,
  Briefcase,
  GraduationCap,
  Zap,
  Rocket,
  MessageSquareText,
  Award,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

const KNOWN: Record<string, LucideIcon> = {
  basic: User,
  selfEvaluation: MessageSquareText,
  experience: Briefcase,
  education: GraduationCap,
  skills: Zap,
  projects: Rocket,
  certificates: Award
};

export function getSectionLucideIcon(id: string | undefined): LucideIcon {
  if (!id) return LayoutGrid;
  if (KNOWN[id]) return KNOWN[id];
  // custom-1, custom-2, etc. and any unknown ids
  return LayoutGrid;
}

interface SectionIconProps {
  id?: string;
  className?: string;
  strokeWidth?: number;
}

export function SectionIcon({ id, className, strokeWidth = 1.8 }: SectionIconProps) {
  const Icon = getSectionLucideIcon(id);
  return <Icon className={cn("w-4 h-4", className)} strokeWidth={strokeWidth} />;
}
