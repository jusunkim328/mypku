"use client";

import React from "react";

// Page 컴포넌트
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {children}
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
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// Button 컴포넌트
export function Button({
  children,
  onClick,
  disabled = false,
  large = false,
  small = false,
  outline = false,
  clear = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  large?: boolean;
  small?: boolean;
  outline?: boolean;
  clear?: boolean;
  className?: string;
}) {
  const baseClasses = "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
  const sizeClasses = large ? "px-6 py-3 text-base" : small ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const variantClasses = clear
    ? "text-indigo-600 hover:text-indigo-700 bg-transparent"
    : outline
      ? "border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
      : "bg-indigo-500 text-white hover:bg-indigo-600";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
    >
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
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(progress * 100, 100)}%` }}
      />
    </div>
  );
}
