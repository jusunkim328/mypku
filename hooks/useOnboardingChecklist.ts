"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OnboardingChecklistState {
  dismissed: boolean;
  firstSeenAt: string | null; // ISO date
  dismiss: () => void;
  markFirstSeen: () => void;
  shouldShow: (allCompleted: boolean) => boolean;
}

export const useOnboardingChecklist = create<OnboardingChecklistState>()(
  persist(
    (set, get) => ({
      dismissed: false,
      firstSeenAt: null,

      dismiss: () => set({ dismissed: true }),

      markFirstSeen: () => {
        if (!get().firstSeenAt) {
          set({ firstSeenAt: new Date().toISOString() });
        }
      },

      shouldShow: (allCompleted: boolean) => {
        const { dismissed, firstSeenAt } = get();
        if (dismissed || allCompleted) return false;
        if (!firstSeenAt) return true; // will be set on first render
        const daysSince = (Date.now() - new Date(firstSeenAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 7;
      },
    }),
    {
      name: "mypku-onboarding-checklist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dismissed: state.dismissed,
        firstSeenAt: state.firstSeenAt,
      }),
    }
  )
);
