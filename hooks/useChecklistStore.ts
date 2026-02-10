"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const CHECKLIST_ITEMS = [
  "meetTeam",
  "learnAllowance",
  "setupFormula",
  "readLabels",
  "startTracking",
  "stockFoods",
  "scheduleTests",
] as const;

export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

interface ChecklistStore {
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
  isAllCompleted: () => boolean;
  getCompletedCount: () => number;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

export const useChecklistStore = create<ChecklistStore>()(
  persist(
    (set, get) => ({
      checked: {},
      toggle: (key) =>
        set((state) => ({
          checked: { ...state.checked, [key]: !state.checked[key] },
        })),
      isAllCompleted: () => {
        const { checked } = get();
        return CHECKLIST_ITEMS.every((item) => checked[item]);
      },
      getCompletedCount: () => {
        const { checked } = get();
        return CHECKLIST_ITEMS.filter((item) => checked[item]).length;
      },
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "mypku-checklist-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
