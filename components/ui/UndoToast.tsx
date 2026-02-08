"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface UndoItem {
  id: string;
  label: string;
  timeout: number;
  createdAt: number;
}

export default function UndoToast() {
  const t = useTranslations("Undo");
  const [items, setItems] = useState<UndoItem[]>([]);

  useEffect(() => {
    const handleAdd = (
      e: CustomEvent<{ id: string; label: string; timeout: number }>
    ) => {
      setItems((prev) => [
        ...prev.filter((i) => i.id !== e.detail.id),
        {
          ...e.detail,
          createdAt: Date.now(),
        },
      ]);
    };

    const handleRemove = (e: CustomEvent<{ id: string }>) => {
      setItems((prev) => prev.filter((i) => i.id !== e.detail.id));
    };

    window.addEventListener("undo-delete", handleAdd as EventListener);
    window.addEventListener("undo-removed", handleRemove as EventListener);
    return () => {
      window.removeEventListener("undo-delete", handleAdd as EventListener);
      window.removeEventListener(
        "undo-removed",
        handleRemove as EventListener
      );
    };
  }, []);

  // Auto-remove after timeout
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((item) => {
      const remaining = item.timeout - (Date.now() - item.createdAt);
      if (remaining <= 0) return null;
      return setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, remaining);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [items]);

  const handleUndo = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("undo-cancel", { detail: { id } }));
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto relative mx-auto max-w-md w-full rounded-xl bg-gray-900 dark:bg-gray-800 text-white shadow-lg px-4 py-3 flex items-center gap-3"
          >
            <p className="flex-1 text-sm truncate">
              {t("deleted", { name: item.label })}
            </p>
            <button
              onClick={() => handleUndo(item.id)}
              className="text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors shrink-0"
            >
              {t("undo")}
            </button>
            {/* Progress bar - CSS animation driven */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 rounded-b-xl overflow-hidden">
              <div
                className="h-full bg-primary-400"
                style={{
                  animation: `undo-shrink ${item.timeout}ms linear forwards`,
                }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
