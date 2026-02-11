"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  large = false,
  small = false,
  outline = false,
  clear = false,
  danger = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  large?: boolean;
  small?: boolean;
  outline?: boolean;
  clear?: boolean;
  danger?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const baseClasses = `
    font-semibold rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    active:scale-[0.98] disabled:active:scale-100
  `;
  const sizeClasses = large ? "px-6 py-3 text-base min-h-[44px]" : small ? "px-3 py-1.5 text-sm min-h-[36px]" : "px-4 py-2.5 text-sm min-h-[44px]";

  let variantClasses = "";
  if (clear) {
    variantClasses = danger
      ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500"
      : "text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-transparent hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500";
  } else if (outline) {
    variantClasses = danger
      ? "border-2 border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500"
      : "border-2 border-primary-400 dark:border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500";
  } else {
    variantClasses = danger
      ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-md hover:shadow-lg focus:ring-red-500"
      : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg focus:ring-primary-500";
  }

  const disabledClasses = (disabled || loading) ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className} inline-flex items-center justify-center gap-2`}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4" />}
      {children}
    </button>
  );
}
