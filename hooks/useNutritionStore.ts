"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  UserMode,
  MealRecord,
  NutritionData,
  DailyGoals,
} from "@/types/nutrition";

interface NutritionState {
  // 사용자 모드
  mode: UserMode;
  setMode: (mode: UserMode) => void;

  // 일일 목표
  dailyGoals: DailyGoals;
  setDailyGoals: (goals: Partial<DailyGoals>) => void;

  // 식사 기록
  mealRecords: MealRecord[];
  addMealRecord: (record: MealRecord) => void;
  removeMealRecord: (id: string) => void;
  updateMealRecord: (id: string, record: Partial<MealRecord>) => void;

  // 계산된 값
  todayNutrition: NutritionData;
  getTodayMeals: () => MealRecord[];
  getWeeklyData: () => { date: string; nutrition: NutritionData }[];

  // 하이드레이션 상태
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein_g: 50,
  carbs_g: 250,
  fat_g: 65,
  phenylalanine_mg: 300, // PKU 기본값
};

const EMPTY_NUTRITION: NutritionData = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  phenylalanine_mg: 0,
};

// 오늘 날짜인지 확인
const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// 최근 7일 내인지 확인
const isWithinWeek = (dateString: string): boolean => {
  const date = new Date(dateString);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
};

// 영양소 합산
const sumNutrition = (records: MealRecord[]): NutritionData => {
  return records.reduce(
    (acc, record) => ({
      calories: acc.calories + record.totalNutrition.calories,
      protein_g: acc.protein_g + record.totalNutrition.protein_g,
      carbs_g: acc.carbs_g + record.totalNutrition.carbs_g,
      fat_g: acc.fat_g + record.totalNutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) +
        (record.totalNutrition.phenylalanine_mg || 0),
    }),
    { ...EMPTY_NUTRITION }
  );
};

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      mode: "general",
      setMode: (mode) => set({ mode }),

      dailyGoals: DEFAULT_GOALS,
      setDailyGoals: (goals) =>
        set((state) => ({
          dailyGoals: { ...state.dailyGoals, ...goals },
        })),

      mealRecords: [],
      addMealRecord: (record) =>
        set((state) => ({
          mealRecords: [record, ...state.mealRecords],
        })),
      removeMealRecord: (id) =>
        set((state) => ({
          mealRecords: state.mealRecords.filter((r) => r.id !== id),
        })),
      updateMealRecord: (id, updates) =>
        set((state) => ({
          mealRecords: state.mealRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      get todayNutrition() {
        const todayMeals = get().mealRecords.filter((r) => isToday(r.timestamp));
        return sumNutrition(todayMeals);
      },

      getTodayMeals: () => {
        return get().mealRecords.filter((r) => isToday(r.timestamp));
      },

      getWeeklyData: () => {
        const records = get().mealRecords.filter((r) =>
          isWithinWeek(r.timestamp)
        );

        // 날짜별로 그룹화
        const byDate = records.reduce(
          (acc, record) => {
            const date = new Date(record.timestamp).toISOString().split("T")[0];
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(record);
            return acc;
          },
          {} as Record<string, MealRecord[]>
        );

        // 최근 7일 데이터 생성
        const result = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          result.push({
            date: dateStr,
            nutrition: byDate[dateStr]
              ? sumNutrition(byDate[dateStr])
              : EMPTY_NUTRITION,
          });
        }

        return result;
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-nutrition-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        dailyGoals: state.dailyGoals,
        mealRecords: state.mealRecords,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
