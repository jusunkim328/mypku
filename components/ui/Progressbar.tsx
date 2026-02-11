"use client";

import React from "react";

export function Progressbar({
  progress,
  className = "",
  warning = false,
  showGlow = false,
}: {
  progress: number;
  className?: string;
  warning?: boolean;
  showGlow?: boolean;
}) {
  const isOver = progress > 1;
  const clampedProgress = Math.min(progress, 1);

  const getBarStyle = () => {
    if (isOver && warning) {
      return "bg-gradient-to-r from-red-500 to-rose-500";
    } else if (isOver) {
      return "bg-gradient-to-r from-amber-400 to-orange-500";
    }
    return "bg-gradient-to-r from-primary-400 to-primary-600";
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`
          h-full rounded-full transition-all duration-500 ease-out
          ${getBarStyle()}
          ${showGlow && !isOver ? "animate-progress-pulse" : ""}
        `}
        style={{ width: `${clampedProgress * 100}%` }}
      />
    </div>
  );
}
