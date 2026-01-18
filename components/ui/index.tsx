"use client";

import React from "react";

// Page 컴포넌트
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-gray-50 animate-fade-in ${className}`}>
      <div className="max-w-2xl mx-auto">
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="w-16">{left}</div>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="w-16 text-right">{right}</div>
      </div>
    </header>
  );
}

// Block 컴포넌트
export function Block({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

// Card 컴포넌트
export function Card({
  children,
  className = "",
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm ${animate ? "animate-fade-in-up" : ""} ${className}`}>
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
  const baseClasses = "font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]";
  const sizeClasses = large ? "px-6 py-3 text-base" : small ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";

  let variantClasses = "";
  if (clear) {
    variantClasses = danger
      ? "text-red-600 hover:text-red-700 bg-transparent focus:ring-red-500"
      : "text-indigo-600 hover:text-indigo-700 bg-transparent focus:ring-indigo-500";
  } else if (outline) {
    variantClasses = danger
      ? "border-2 border-red-500 text-red-600 hover:bg-red-50 focus:ring-red-500"
      : "border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500";
  } else {
    variantClasses = danger
      ? "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
      : "bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-500";
  }

  const disabledClasses = (disabled || loading) ? "opacity-50 cursor-not-allowed active:scale-100" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className} inline-flex items-center justify-center gap-2`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// Preloader 컴포넌트
export function Preloader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-5 h-5 ${className}`} />
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
    <div className={`animate-spin rounded-full border-gray-300 border-t-indigo-600 ${sizeClasses[size]} ${className}`} />
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
    <div className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`} />
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Toggle 컴포넌트
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        checked ? "bg-indigo-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// List 컴포넌트
export function List({ children, className = "" }: { children: React.ReactNode; className?: string; strongIos?: boolean; insetIos?: boolean }) {
  return <div className={`divide-y divide-gray-100 ${className}`}>{children}</div>;
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
        <p className="text-base font-medium text-gray-900">{title}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
}: {
  progress: number;
  className?: string;
  warning?: boolean;
}) {
  const isOver = progress > 1;
  const barColor = isOver && warning
    ? "bg-red-500"
    : isOver
      ? "bg-amber-500"
      : "bg-indigo-500";

  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(progress * 100, 100)}%` }}
      />
    </div>
  );
}
