"use client";

import type { ConfidenceLevel } from "@/types/nutrition";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  t: (key: string) => string;
}

const LEVEL_COLORS: Record<ConfidenceLevel, string> = {
  high: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-red-600 dark:text-red-400",
};

export function ConfidenceBadge({ level, t }: ConfidenceBadgeProps) {
  return (
    <span className={`text-xs ${LEVEL_COLORS[level]}`}>
      {t("confidence")}: {t(level)}
    </span>
  );
}
