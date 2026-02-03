"use client";

import React from "react";
import { Loader2 } from "lucide-react";

// Page 컴포넌트
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-gradient-warm bg-pattern-dots animate-fade-in ${className}`}>
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto">
        {children}
      </div>
    </div>
  );
}

// Navbar 컴포넌트
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
        <div className="w-16 md:w-20 text-right">{right}</div>
      </div>
    </header>
  );
}

// Block 컴포넌트
export function Block({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 md:p-6 lg:p-8 ${className}`}>{children}</div>;
}

// Card 컴포넌트
export function Card({
  children,
  className = "",
  animate = true,
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  elevated?: boolean;
}) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-900/80 rounded-2xl
        ${elevated ? "card-elevated" : "shadow-soft"}
        border border-gray-100 dark:border-gray-800
        hover:shadow-soft-lg transition-all duration-200
        ${animate ? "animate-fade-in-up" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Button 컴포넌트
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
  const sizeClasses = large ? "px-6 py-3 text-base" : small ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm";

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

// Preloader 컴포넌트
export function Preloader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-primary-500 w-6 h-6 ${className}`} />
  );
}

// Spinner 컴포넌트 (큰 로딩)
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

// 스켈레톤 컴포넌트
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

// 스켈레톤 카드 (대시보드용)
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

// 로딩 오버레이
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

// Toggle 컴포넌트
export function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative w-12 h-7 rounded-full transition-all duration-300
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
          absolute top-1 w-5 h-5 bg-white rounded-full shadow-md
          transition-transform duration-300 ease-out
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

// List 컴포넌트
export function List({ children, className = "" }: { children: React.ReactNode; className?: string; strongIos?: boolean; insetIos?: boolean }) {
  return <div className={`divide-y divide-gray-100 dark:divide-gray-800 ${className}`}>{children}</div>;
}

// ListItem 컴포넌트
export function ListItem({
  title,
  subtitle,
  after,
}: {
  title: string;
  subtitle?: string;
  after?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {after && <div>{after}</div>}
    </div>
  );
}

// Progressbar 컴포넌트
export function Progressbar({
  progress,
  className = "",
  warning = false,
  showGlow = false,
}: {
  progress: number;
  className?: string;
  warning?: boolean;
  showGlow?: boolean;
}) {
  const isOver = progress > 1;
  const clampedProgress = Math.min(progress, 1);

  const getBarStyle = () => {
    if (isOver && warning) {
      return "bg-gradient-to-r from-red-500 to-rose-500";
    } else if (isOver) {
      return "bg-gradient-to-r from-amber-400 to-orange-500";
    }
    return "bg-gradient-to-r from-primary-400 to-primary-600";
  };

  return (
    <div className={`h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className={`
          h-full rounded-full transition-all duration-500 ease-out
          ${getBarStyle()}
          ${showGlow && !isOver ? "animate-progress-pulse" : ""}
        `}
        style={{ width: `${clampedProgress * 100}%` }}
      />
    </div>
  );
}

// Input 컴포넌트
export function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
}: {
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-4 py-2.5 rounded-xl text-sm
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
