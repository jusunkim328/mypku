"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  MealRecord,
  NutritionData,
  DailyGoals,
} from "@/types/nutrition";

interface WaterIntake {
  date: string; // YYYY-MM-DD
  glasses: number; // 1 glass = 250ml
}

interface FormulaSettings {
  formulaName: string;
  servingAmount: number;
  servingUnit: "ml" | "g" | "scoop";
  timeSlots: string[];
  isActive: boolean;
}

interface NutritionState {
  // 퀵셋업 완료 여부 (Phase 1 호환)
  quickSetupCompleted: boolean;
  setQuickSetupCompleted: (completed: boolean) => void;

  // 온보딩 완료 여부 (Phase 2)
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;

  // 진단 시기 (온보딩 Step 1)
  diagnosisAgeGroup: string | null;
  setDiagnosisAgeGroup: (group: string | null) => void;

  // 포뮬러 설정 (온보딩 Step 3, Phase 2.3에서 확장)
  formulaSettings: FormulaSettings | null;
  setFormulaSettings: (settings: FormulaSettings | null) => void;

  // 일일 목표 (PKU 전용)
  dailyGoals: DailyGoals;
  setDailyGoals: (goals: Partial<DailyGoals>) => void;
  waterGoal: number; // glasses per day (default 8)
  setWaterGoal: (glasses: number) => void;

  // 식사 기록
  mealRecords: MealRecord[];
  addMealRecord: (record: MealRecord) => void;
  removeMealRecord: (id: string) => void;
  updateMealRecord: (id: string, record: Partial<MealRecord>) => void;

  // 수분 섭취
  waterIntakes: WaterIntake[];
  addWaterGlass: () => void;
  removeWaterGlass: () => void;
  getTodayWaterIntake: () => number;
  getWaterIntakeByDate: (date: Date) => number;

  // 계산된 값 (함수로 변경)
  getTodayNutrition: () => NutritionData;
  getTodayMeals: () => MealRecord[];
  getWeeklyData: () => { date: string; nutrition: NutritionData }[];
  getNutritionByDate: (date: Date) => NutritionData;
  getMealsByDate: (date: Date) => MealRecord[];
  getMonthlyData: (year: number, month: number) => Record<string, NutritionData>;

  // Exchange 계산 (PKU 전용: 1 Exchange = 50mg Phe)
  getExchanges: (phenylalanine_mg: number) => number;
  getTodayExchanges: () => number;
  getExchangeGoal: () => number;

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

// 불완전한 nutrition 데이터를 정규화
const normalizeNutrition = (n: Partial<NutritionData> | null | undefined): NutritionData => ({
  ...EMPTY_NUTRITION,
  ...n,
});

// 특정 날짜인지 확인
const isSameDate = (dateString: string, targetDate: Date): boolean => {
  const date = new Date(dateString);
  return (
    date.getDate() === targetDate.getDate() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getFullYear() === targetDate.getFullYear()
  );
};

// 오늘 날짜인지 확인
const isToday = (dateString: string): boolean => {
  return isSameDate(dateString, new Date());
};

// Exchange 상수 (1 Exchange = 50mg Phe)
const PHE_PER_EXCHANGE = 50;

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
        acc.phenylalanine_mg + record.totalNutrition.phenylalanine_mg,
    }),
    { ...EMPTY_NUTRITION }
  );
};

// 오늘 날짜 문자열 (YYYY-MM-DD)
const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      // 퀵셋업 상태 (Phase 1 호환)
      quickSetupCompleted: false,
      setQuickSetupCompleted: (completed) => set({ quickSetupCompleted: completed }),

      // 온보딩 상태 (Phase 2)
      onboardingCompleted: false,
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

      // 진단 시기
      diagnosisAgeGroup: null,
      setDiagnosisAgeGroup: (group) => set({ diagnosisAgeGroup: group }),

      // 포뮬러 설정
      formulaSettings: null,
      setFormulaSettings: (settings) => set({ formulaSettings: settings }),

      dailyGoals: DEFAULT_GOALS,
      setDailyGoals: (goals) =>
        set((state) => ({
          dailyGoals: { ...state.dailyGoals, ...goals },
        })),

      waterGoal: 8, // 기본 8잔 (2L)
      setWaterGoal: (glasses) => set({ waterGoal: glasses }),

      waterIntakes: [],
      addWaterGlass: () => {
        const today = getTodayDateStr();
        set((state) => {
          const existingIndex = state.waterIntakes.findIndex((w) => w.date === today);
          if (existingIndex >= 0) {
            const updated = [...state.waterIntakes];
            updated[existingIndex] = {
              ...updated[existingIndex],
              glasses: updated[existingIndex].glasses + 1,
            };
            return { waterIntakes: updated };
          }
          return {
            waterIntakes: [...state.waterIntakes, { date: today, glasses: 1 }],
          };
        });
      },
      removeWaterGlass: () => {
        const today = getTodayDateStr();
        set((state) => {
          const existingIndex = state.waterIntakes.findIndex((w) => w.date === today);
          if (existingIndex >= 0 && state.waterIntakes[existingIndex].glasses > 0) {
            const updated = [...state.waterIntakes];
            updated[existingIndex] = {
              ...updated[existingIndex],
              glasses: Math.max(0, updated[existingIndex].glasses - 1),
            };
            return { waterIntakes: updated };
          }
          return state;
        });
      },
      getTodayWaterIntake: () => {
        const today = getTodayDateStr();
        const intake = get().waterIntakes.find((w) => w.date === today);
        return intake?.glasses || 0;
      },
      getWaterIntakeByDate: (date: Date) => {
        const dateStr = date.toISOString().split("T")[0];
        const intake = get().waterIntakes.find((w) => w.date === dateStr);
        return intake?.glasses || 0;
      },

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

      getTodayNutrition: () => {
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

      // 특정 날짜의 영양소 합계
      getNutritionByDate: (date: Date) => {
        const meals = get().mealRecords.filter((r) => isSameDate(r.timestamp, date));
        return sumNutrition(meals);
      },

      // 특정 날짜의 식사 목록
      getMealsByDate: (date: Date) => {
        return get().mealRecords.filter((r) => isSameDate(r.timestamp, date));
      },

      // 월간 데이터 (달력 뷰용)
      getMonthlyData: (year: number, month: number) => {
        const records = get().mealRecords.filter((r) => {
          const date = new Date(r.timestamp);
          return date.getFullYear() === year && date.getMonth() === month;
        });

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

        // 날짜별 영양소 합계
        const result: Record<string, NutritionData> = {};
        for (const [date, meals] of Object.entries(byDate)) {
          result[date] = sumNutrition(meals);
        }

        return result;
      },

      // Exchange 계산 (1 Exchange = 50mg Phe)
      getExchanges: (phenylalanine_mg: number) => {
        return Math.round((phenylalanine_mg / PHE_PER_EXCHANGE) * 10) / 10;
      },

      // 오늘의 Exchange 합계
      getTodayExchanges: () => {
        const todayNutrition = get().getTodayNutrition();
        return get().getExchanges(todayNutrition.phenylalanine_mg || 0);
      },

      // Exchange 목표 (일일 Phe 목표 / 50)
      getExchangeGoal: () => {
        const pheGoal = get().dailyGoals.phenylalanine_mg || 300;
        return get().getExchanges(pheGoal);
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-nutrition-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        quickSetupCompleted: state.quickSetupCompleted,
        onboardingCompleted: state.onboardingCompleted,
        diagnosisAgeGroup: state.diagnosisAgeGroup,
        formulaSettings: state.formulaSettings,
        dailyGoals: state.dailyGoals,
        mealRecords: state.mealRecords,
        waterIntakes: state.waterIntakes,
        waterGoal: state.waterGoal,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // localStorage에서 복원된 mealRecords의 totalNutrition 정규화
          const records = state.mealRecords;
          if (records?.length) {
            const needsNormalization = records.some(
              (r) => !r.totalNutrition || r.totalNutrition.protein_g === undefined
            );
            if (needsNormalization) {
              state.mealRecords = records.map((r) => ({
                ...r,
                totalNutrition: normalizeNutrition(r.totalNutrition),
              }));
            }
          }
          state.setHasHydrated(true);
        }
      },
    }
  )
);
