"use client";

import React from "react";

export function Card({
  children,
  className = "",
  animate = true,
  elevated = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  elevated?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`
        bg-white dark:bg-gray-900/80 rounded-2xl
        ${elevated ? "card-elevated" : "shadow-soft"}
        border border-gray-100 dark:border-gray-800
        hover:shadow-soft-lg transition-all duration-200
        ${animate ? "animate-fade-in-up" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
