"use client";

import { Bot, Database, Mic } from "lucide-react";
import type { DataSource } from "@/types/nutrition";

interface SourceIconProps {
  source: DataSource;
  className?: string;
}

export function SourceIcon({ source, className = "w-3 h-3" }: SourceIconProps) {
  switch (source) {
    case "ai":
      return <Bot className={className} />;
    case "barcode":
      return <Database className={className} />;
    case "manual":
    case "usda":
    case "kfda":
      return <Database className={className} />;
    case "voice":
      return <Mic className={className} />;
    default:
      return <Bot className={className} />;
  }
}

interface SourceBadgeProps {
  source: DataSource;
  t: (key: string) => string;
}

const SOURCE_COLORS: Record<DataSource, string> = {
  ai: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700",
  barcode: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  manual: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  usda: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  kfda: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700",
  voice: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
};

export function SourceBadge({ source, t }: SourceBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${SOURCE_COLORS[source]}`}>
      <SourceIcon source={source} />
      {t(`source_${source}`)}
    </span>
  );
}
