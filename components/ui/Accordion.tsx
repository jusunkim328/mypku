"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

interface AccordionGroupProps {
  items: AccordionItem[];
  storageKey?: string;
  defaultOpen?: string[];
  className?: string;
}

export function AccordionGroup({
  items,
  storageKey,
  defaultOpen = [],
  className = "",
}: AccordionGroupProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(defaultOpen));
  const hydratedRef = useRef(false);

  // Hydrate from localStorage after mount (avoids SSR/CSR mismatch)
  useEffect(() => {
    if (!storageKey) {
      hydratedRef.current = true;
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setOpenIds(new Set(JSON.parse(saved) as string[]));
    } catch {
      // ignore parse errors
    }
    hydratedRef.current = true;
  }, [storageKey]);

  // Persist to localStorage only after hydration (avoids overwriting with defaultOpen)
  useEffect(() => {
    if (!hydratedRef.current || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...openIds]));
    } catch {
      // ignore storage errors
    }
  }, [openIds, storageKey]);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="flex items-center gap-3 w-full py-3 px-2 text-left text-base font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors duration-150"
            >
              {item.icon && (
                <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.title}</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={isOpen ? "" : "hidden"}>
              {item.children}
            </div>
          </div>
        );
      })}
    </div>
  );
}
