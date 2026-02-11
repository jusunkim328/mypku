"use client";

import React from "react";

export function Toggle({
  checked,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative w-12 h-7 min-h-[44px] min-w-[44px] rounded-full transition-all duration-300
        flex items-center
        ${checked
          ? "bg-gradient-to-r from-primary-500 to-primary-600"
          : "bg-gray-300 dark:bg-gray-600"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      `}
    >
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md
          transition-transform duration-300 ease-out
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}
