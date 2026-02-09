"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const rafRef = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Mount → slide up; close → slide down → unmount
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setVisible(true);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setShow(true);
        });
        rafRef.current = raf2;
      });
      rafRef.current = raf1;
    } else {
      setShow(false);
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen]);

  // Body scroll lock (iOS-safe: position:fixed + scrollY 보존)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Focus panel when shown
  useEffect(() => {
    if (show && panelRef.current) {
      panelRef.current.focus();
    }
  }, [show]);

  const handleTransitionEnd = useCallback(() => {
    if (!show) {
      setVisible(false);
      // Restore focus to previously focused element
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [show]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: cycle Tab within the panel
  useEffect(() => {
    if (!isOpen || !visible || !panelRef.current) return;
    const panel = panelRef.current;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === panel) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button
        type="button"
        className={`absolute inset-0 w-full h-full bg-black/50 transition-opacity duration-300 cursor-default ${show ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out outline-none ${show ? "translate-y-0" : "translate-y-full"}`}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </div>
  );
}
