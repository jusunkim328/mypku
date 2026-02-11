"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null; // YYYY-MM-DD format
  totalLoggingDays: number;
  streakHistory: string[]; // Array of dates with logs
}

interface StreakStore extends StreakData {
  // Actions
  recordLog: () => void;
  calculateStreak: (logDates: string[]) => void;
  resetStreak: () => void;

  // Getters
  getStreakStatus: () => "active" | "at_risk" | "broken";

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

// 날짜를 YYYY-MM-DD 형식으로 변환
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// 두 날짜 사이의 일수 차이
const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// 어제 날짜
const getYesterday = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

export const useStreakStore = create<StreakStore>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      totalLoggingDays: 0,
      streakHistory: [],

      // 오늘 기록 추가
      recordLog: () => {
        const today = formatDate(new Date());
        const { lastLogDate, currentStreak, longestStreak, streakHistory } = get();

        // 이미 오늘 기록했으면 무시
        if (lastLogDate === today) return;

        let newStreak = 1;
        const yesterday = getYesterday();

        if (lastLogDate === yesterday) {
          // 연속 기록 유지
          newStreak = currentStreak + 1;
        } else if (lastLogDate && daysBetween(lastLogDate, today) > 1) {
          // 스트릭 끊김
          newStreak = 1;
        }

        const newLongestStreak = Math.max(longestStreak, newStreak);
        const newHistory = [...streakHistory, today].slice(-365); // 최근 1년만 유지

        set({
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastLogDate: today,
          totalLoggingDays: get().totalLoggingDays + 1,
          streakHistory: newHistory,
        });
      },

      // 기존 기록들로 스트릭 계산 (초기화 시 사용)
      calculateStreak: (logDates: string[]) => {
        if (logDates.length === 0) {
          set({
            currentStreak: 0,
            longestStreak: 0,
            lastLogDate: null,
            totalLoggingDays: 0,
            streakHistory: [],
          });
          return;
        }

        // 날짜 정렬 (오래된 순)
        const sortedDates = [...new Set(logDates)].sort();
        const today = formatDate(new Date());
        const yesterday = getYesterday();

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        // 스트릭 계산
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = daysBetween(sortedDates[i - 1], sortedDates[i]);
          if (diff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // 현재 스트릭 계산 (오늘 또는 어제 기록이 있어야 유효)
        const lastDate = sortedDates[sortedDates.length - 1];
        if (lastDate === today || lastDate === yesterday) {
          // 마지막 날짜부터 역순으로 연속된 날 수 계산
          currentStreak = 1;
          for (let i = sortedDates.length - 2; i >= 0; i--) {
            const diff = daysBetween(sortedDates[i], sortedDates[i + 1]);
            if (diff === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        set({
          currentStreak,
          longestStreak,
          lastLogDate: lastDate,
          totalLoggingDays: sortedDates.length,
          streakHistory: sortedDates.slice(-365),
        });
      },

      resetStreak: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastLogDate: null,
          totalLoggingDays: 0,
          streakHistory: [],
        });
      },

      getStreakStatus: () => {
        const { lastLogDate } = get();
        const today = formatDate(new Date());
        const yesterday = getYesterday();

        if (!lastLogDate) return "broken";
        if (lastLogDate === today) return "active";
        if (lastLogDate === yesterday) return "at_risk";
        return "broken";
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-streak-storage",
      version: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (state: any) => state,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastLogDate: state.lastLogDate,
        totalLoggingDays: state.totalLoggingDays,
        streakHistory: state.streakHistory,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
