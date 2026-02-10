/**
 * useMealRecords는 React 훅이므로 직접 테스트가 복잡합니다.
 * useMealRecords가 내부적으로 사용하는 useNutritionStore의
 * localStorage 모드 로직을 테스트합니다.
 *
 * Supabase 연동 로직은 통합 테스트에서 다루는 것이 적합합니다.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { MealRecord } from "@/types/nutrition";

const resetStore = () => {
  useNutritionStore.setState({
    mealRecords: [],
    dailyGoals: {
      calories: 2000,
      protein_g: 50,
      carbs_g: 250,
      fat_g: 65,
      phenylalanine_mg: 300,
    },
    waterIntakes: [],
    waterGoal: 8,
    quickSetupCompleted: false,
    onboardingCompleted: false,
    diagnosisAgeGroup: null,
    formulaSettings: null,
    _hasHydrated: false,
  });
};

const makeMealRecord = (overrides: Partial<MealRecord> = {}): MealRecord => ({
  id: `meal-${Math.random().toString(36).slice(2)}`,
  timestamp: new Date().toISOString(),
  mealType: "lunch",
  items: [],
  totalNutrition: {
    calories: 500,
    protein_g: 20,
    carbs_g: 60,
    fat_g: 15,
    phenylalanine_mg: 100,
  },
  ...overrides,
});

describe("useMealRecords (localStorage mode via useNutritionStore)", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("addMealRecord / removeMealRecord", () => {
    it("로컬 스토어에 식사 기록을 추가할 수 있다", () => {
      const record = makeMealRecord({ id: "local-1" });
      useNutritionStore.getState().addMealRecord(record);

      const records = useNutritionStore.getState().mealRecords;
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("local-1");
    });

    it("로컬 스토어에서 식사 기록을 삭제할 수 있다", () => {
      const record = makeMealRecord({ id: "delete-me" });
      useNutritionStore.getState().addMealRecord(record);
      useNutritionStore.getState().removeMealRecord("delete-me");

      expect(useNutritionStore.getState().mealRecords).toHaveLength(0);
    });
  });

  describe("getTodayMeals (날짜 필터링)", () => {
    it("오늘의 식사만 반환한다", () => {
      const todayRecord = makeMealRecord({ id: "today" });
      const yesterdayRecord = makeMealRecord({
        id: "yesterday",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      });

      useNutritionStore.getState().addMealRecord(todayRecord);
      useNutritionStore.getState().addMealRecord(yesterdayRecord);

      const todayMeals = useNutritionStore.getState().getTodayMeals();
      expect(todayMeals).toHaveLength(1);
      expect(todayMeals[0].id).toBe("today");
    });
  });

  describe("getWeeklyData", () => {
    it("최근 7일 데이터를 반환한다", () => {
      const weeklyData = useNutritionStore.getState().getWeeklyData();
      expect(weeklyData).toHaveLength(7);
    });

    it("기록이 없는 날은 영양소가 0이다", () => {
      const weeklyData = useNutritionStore.getState().getWeeklyData();
      for (const day of weeklyData) {
        expect(day.nutrition.calories).toBe(0);
        expect(day.nutrition.phenylalanine_mg).toBe(0);
      }
    });

    it("오늘 기록이 있으면 해당 날짜에 반영된다", () => {
      const record = makeMealRecord({
        totalNutrition: {
          calories: 500,
          protein_g: 20,
          carbs_g: 60,
          fat_g: 15,
          phenylalanine_mg: 100,
        },
      });
      useNutritionStore.getState().addMealRecord(record);

      const weeklyData = useNutritionStore.getState().getWeeklyData();
      const todayData = weeklyData[weeklyData.length - 1]; // 마지막이 오늘
      expect(todayData.nutrition.calories).toBe(500);
      expect(todayData.nutrition.phenylalanine_mg).toBe(100);
    });
  });
});
