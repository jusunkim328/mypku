"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface PendingDelete {
  id: string;
  label: string;
  onConfirm: () => Promise<void>;
  timer: ReturnType<typeof setTimeout>;
}

interface UseUndoDeleteReturn {
  pendingIds: Set<string>;
  scheduleDelete: (
    id: string,
    label: string,
    onConfirm: () => Promise<void>
  ) => void;
  cancelDelete: (id: string) => void;
}

export function useUndoDelete(timeout = 5000): UseUndoDeleteReturn {
  const pendingRef = useRef<Map<string, PendingDelete>>(new Map());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const cancelDelete = useCallback((id: string) => {
    const pending = pendingRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingRef.current.delete(id);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  // Flush all pending deletes on unmount (page navigation)
  useEffect(() => {
    return () => {
      if (pendingRef.current.size === 0) return;
      for (const pending of pendingRef.current.values()) {
        clearTimeout(pending.timer);
        pending.onConfirm().catch(console.error);
      }
      pendingRef.current.clear();
    };
  }, []);

  // Listen for undo-cancel events from UndoToast
  useEffect(() => {
    const handleCancel = (e: CustomEvent<{ id: string }>) => {
      cancelDelete(e.detail.id);
    };
    window.addEventListener("undo-cancel", handleCancel as EventListener);
    return () =>
      window.removeEventListener("undo-cancel", handleCancel as EventListener);
  }, [cancelDelete]);

  const scheduleDelete = useCallback(
    (id: string, label: string, onConfirm: () => Promise<void>) => {
      // Cancel existing timer for same id
      const existing = pendingRef.current.get(id);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(() => {
        onConfirm().catch(console.error);
        pendingRef.current.delete(id);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        window.dispatchEvent(
          new CustomEvent("undo-removed", { detail: { id } })
        );
      }, timeout);

      pendingRef.current.set(id, { id, label, onConfirm, timer });
      setPendingIds((prev) => new Set(prev).add(id));

      // Dispatch custom event for UndoToast
      window.dispatchEvent(
        new CustomEvent("undo-delete", {
          detail: { id, label, timeout },
        })
      );
    },
    [timeout]
  );

  return { pendingIds, scheduleDelete, cancelDelete };
}
