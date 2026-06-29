import {
  Atom,
  BookOpenText,
  Brain,
  BriefcaseBusiness,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Magnet,
  Microscope,
  MousePointer2,
  Music,
  Palette,
  PenTool,
  Sigma,
  Telescope,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudyIconKey } from "../types";

export interface StudyIconOption {
  key: StudyIconKey;
  label: string;
  icon: LucideIcon;
}

export const studyIconOptions: StudyIconOption[] = [
  { key: "math-basic", label: "数学基础", icon: Calculator },
  { key: "calculus", label: "微积分", icon: Sigma },
  { key: "economics", label: "经济", icon: TrendingUp },
  { key: "biology", label: "生物", icon: Dna },
  { key: "chemistry", label: "化学", icon: FlaskConical },
  { key: "physics", label: "物理", icon: Atom },
  { key: "magnetism", label: "磁场", icon: Magnet },
  { key: "geography", label: "地理", icon: Globe2 },
  { key: "computer", label: "计算机", icon: Code2 },
  { key: "design", label: "设计", icon: MousePointer2 },
  { key: "literature", label: "阅读", icon: BookOpenText },
  { key: "writing", label: "写作", icon: PenTool },
  { key: "psychology", label: "心理", icon: Brain },
  { key: "language", label: "语言", icon: Languages },
  { key: "history", label: "历史", icon: Landmark },
  { key: "business", label: "商科", icon: BriefcaseBusiness },
  { key: "microscope", label: "实验", icon: Microscope },
  { key: "art", label: "艺术", icon: Palette },
  { key: "music", label: "音乐", icon: Music },
  { key: "research", label: "研究", icon: Telescope },
];

export function getStudyIconOption(iconKey?: StudyIconKey) {
  return studyIconOptions.find((option) => option.key === iconKey) ?? studyIconOptions[0];
}

export function SubjectIcon({
  iconKey,
  label,
  size = "md",
  selected = false,
}: {
  iconKey?: StudyIconKey;
  label?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}) {
  const option = getStudyIconOption(iconKey);
  const Icon = option.icon;
  const iconSize = size === "lg" ? 32 : size === "sm" ? 20 : 24;

  return (
    <span
      className={`study-icon study-icon--${size} ${selected ? "study-icon--selected" : ""}`}
      data-icon={option.key}
      aria-label={label ?? option.label}
    >
      <Icon size={iconSize} strokeWidth={2.6} />
    </span>
  );
}
