"use client";

export function Preloader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-primary-500 w-6 h-6 ${className}`} />
  );
}
