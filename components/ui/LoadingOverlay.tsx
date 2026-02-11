"use client";

import React from "react";
import { Spinner } from "./Spinner";

export function LoadingOverlay({ message = "로딩 중..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-elevated">
        <Spinner size="lg" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}
