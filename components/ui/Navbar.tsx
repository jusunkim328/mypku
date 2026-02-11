"use client";

import React from "react";
import DesktopNavLinks from "@/components/layout/DesktopNavLinks";

export function Navbar({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 md:px-6 lg:px-8">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto flex items-center justify-between">
        <div className="w-16 md:w-20">{left}</div>
        <div className="flex-1 text-center">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="w-16 md:w-auto flex items-center justify-end gap-2">
          {right}
          <DesktopNavLinks />
        </div>
      </div>
    </header>
  );
}
