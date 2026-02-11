"use client";

import React from "react";

export function Input({
  id,
  type = "text",
  value,
  onChange,
  onFocus,
  placeholder,
  disabled = false,
  className = "",
}: {
  id?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-4 py-2.5 rounded-xl text-sm min-h-[44px]
        bg-white dark:bg-gray-800
        border border-gray-300 dark:border-gray-600
        text-gray-900 dark:text-gray-100
        placeholder-gray-400 dark:placeholder-gray-500
        focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
        dark:focus:border-primary-400 dark:focus:ring-primary-400/20
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
}
