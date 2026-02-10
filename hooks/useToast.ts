"use client";

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 자동 제거 (기본 3초)
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// 편의 함수
export const toast = {
  success: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: "success", duration }),
  error: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: "error", duration }),
  warning: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: "warning", duration }),
  info: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: "info", duration }),
};
