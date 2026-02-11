"use client";

import React from "react";

export function Block({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 md:p-6 lg:p-8 ${className}`}>{children}</div>;
}
