"use client";

export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };
  return (
    <div className={`animate-spin rounded-full border-gray-300 dark:border-gray-600 border-t-primary-500 ${sizeClasses[size]} ${className}`} />
  );
}
