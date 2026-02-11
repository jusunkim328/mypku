"use client";

import React from "react";

export function List({ children, className = "" }: { children: React.ReactNode; className?: string; strongIos?: boolean; insetIos?: boolean }) {
  return <div className={`divide-y divide-gray-100 dark:divide-gray-800 ${className}`}>{children}</div>;
}

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
    <div className="flex items-center justify-between py-3 min-h-[44px]">
      <div>
        <p className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {after && <div>{after}</div>}
    </div>
  );
}
