"use client";

import React from "react";

export function Page({ children, className = "", noBottomNav = false }: { children: React.ReactNode; className?: string; noBottomNav?: boolean }) {
  return (
    <div className={`min-h-screen bg-gradient-warm bg-pattern-dots animate-fade-in ${!noBottomNav ? "pb-16 md:pb-0" : ""} ${className}`}>
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto">
        {children}
      </div>
    </div>
  );
}
