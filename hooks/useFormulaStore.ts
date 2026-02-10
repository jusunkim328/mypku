"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface FormulaIntakeRecord {
  date: string; // YYYY-MM-DD
  slot: string; // 'morning' | 'noon' | 'evening' | 'bedtime' | custom
  completed: boolean;
  completedAt: string | null; // ISO timestamp
}

interface FormulaStoreState {
  // 일일 포뮬러 섭취 기록
  intakes: FormulaIntakeRecord[];

  // 슬롯 토글 (완료/미완료)
  toggleSlot: (date: string, slot: string) => void;

  // 오늘의 섭취 기록 조회
  getTodayIntakes: () => FormulaIntakeRecord[];

  // 특정 날짜의 섭취 기록 조회
  getIntakesByDate: (date: string) => FormulaIntakeRecord[];

  // 특정 날짜의 슬롯 완료 여부
  isSlotCompleted: (date: string, slot: string) => boolean;

  // 특정 날짜의 완료 수
  getCompletedCount: (date: string, totalSlots: string[]) => number;

  // 하이드레이션
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const useFormulaStore = create<FormulaStoreState>()(
  persist(
    (set, get) => ({
      intakes: [],

      toggleSlot: (date: string, slot: string) => {
        set((state) => {
          const existingIndex = state.intakes.findIndex(
            (i) => i.date === date && i.slot === slot
          );

          if (existingIndex >= 0) {
            // 이미 존재하면 토글
            const updated = [...state.intakes];
            const current = updated[existingIndex];
            updated[existingIndex] = {
              ...current,
              completed: !current.completed,
              completedAt: !current.completed
                ? new Date().toISOString()
                : null,
            };
            return { intakes: updated };
          }

          // 없으면 새로 생성 (completed = true)
          return {
            intakes: [
              ...state.intakes,
              {
                date,
                slot,
                completed: true,
                completedAt: new Date().toISOString(),
              },
            ],
          };
        });
      },

      getTodayIntakes: () => {
        const today = getTodayDateStr();
        return get().intakes.filter((i) => i.date === today);
      },

      getIntakesByDate: (date: string) => {
        return get().intakes.filter((i) => i.date === date);
      },

      isSlotCompleted: (date: string, slot: string) => {
        return (
          get().intakes.find((i) => i.date === date && i.slot === slot)
            ?.completed ?? false
        );
      },

      getCompletedCount: (date: string, totalSlots: string[]) => {
        const intakes = get().intakes.filter((i) => i.date === date);
        return totalSlots.filter((slot) =>
          intakes.find((i) => i.slot === slot && i.completed)
        ).length;
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-formula-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        intakes: state.intakes,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
