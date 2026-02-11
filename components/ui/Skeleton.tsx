"use client";

import React from "react";
import { Card } from "./Card";

export function Skeleton({ className = "", variant = "text" }: { className?: string; variant?: "text" | "circular" | "rectangular" }) {
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };
  return (
    <div className={`skeleton ${variantClasses[variant]} ${className}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <Card className={`p-4 ${className}`} animate={false}>
      <Skeleton className="w-1/3 h-5 mb-4" />
      <div className="flex justify-around">
        <div className="flex flex-col items-center gap-2">
          <Skeleton variant="circular" className="w-20 h-20" />
          <Skeleton className="w-16 h-3" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton variant="circular" className="w-20 h-20" />
          <Skeleton className="w-16 h-3" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton variant="circular" className="w-20 h-20" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
    </Card>
  );
}
