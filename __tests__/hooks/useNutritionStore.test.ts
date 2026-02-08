import { describe, it, expect, beforeEach } from "vitest";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { MealRecord, NutritionData, DailyGoals } from "@/types/nutrition";

// Zustand store를 각 테스트마다 초기화
const resetStore = () => {
  useNutritionStore.setState({
    quickSetupCompleted: false,
    onboardingCompleted: false,
    diagnosisAgeGroup: null,
    formulaSettings: null,
    dailyGoals: {
      calories: 2000,
      protein_g: 50,
      carbs_g: 250,
      fat_g: 65,
      phenylalanine_mg: 300,
    },
    mealRecords: [],
    waterIntakes: [],
    waterGoal: 8,
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

describe("useNutritionStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("초기 상태", () => {
    it("기본 dailyGoals 값이 올바르다", () => {
      const state = useNutritionStore.getState();
      expect(state.dailyGoals).toEqual({
        calories: 2000,
        protein_g: 50,
        carbs_g: 250,
        fat_g: 65,
        phenylalanine_mg: 300,
      });
    });

    it("mealRecords가 빈 배열이다", () => {
      const state = useNutritionStore.getState();
      expect(state.mealRecords).toEqual([]);
    });

    it("quickSetupCompleted가 false이다", () => {
      expect(useNutritionStore.getState().quickSetupCompleted).toBe(false);
    });

    it("onboardingCompleted가 false이다", () => {
      expect(useNutritionStore.getState().onboardingCompleted).toBe(false);
    });

    it("waterGoal 기본값이 8이다", () => {
      expect(useNutritionStore.getState().waterGoal).toBe(8);
    });
  });

  describe("setDailyGoals", () => {
    it("일부 필드만 업데이트해도 나머지 필드가 유지된다", () => {
      const store = useNutritionStore.getState();
      store.setDailyGoals({ phenylalanine_mg: 400 });

      const updated = useNutritionStore.getState().dailyGoals;
      expect(updated.phenylalanine_mg).toBe(400);
      expect(updated.calories).toBe(2000); // 기본값 유지
      expect(updated.protein_g).toBe(50);
    });

    it("모든 필드를 한번에 업데이트할 수 있다", () => {
      const newGoals: DailyGoals = {
        calories: 1800,
        protein_g: 40,
        carbs_g: 200,
        fat_g: 55,
        phenylalanine_mg: 250,
      };
      useNutritionStore.getState().setDailyGoals(newGoals);
      expect(useNutritionStore.getState().dailyGoals).toEqual(newGoals);
    });
  });

  describe("addMealRecord / removeMealRecord", () => {
    it("식사 기록을 추가할 수 있다", () => {
      const record = makeMealRecord({ id: "test-1" });
      useNutritionStore.getState().addMealRecord(record);

      const records = useNutritionStore.getState().mealRecords;
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("test-1");
    });

    it("새 기록이 맨 앞에 추가된다", () => {
      const record1 = makeMealRecord({ id: "first" });
      const record2 = makeMealRecord({ id: "second" });

      useNutritionStore.getState().addMealRecord(record1);
      useNutritionStore.getState().addMealRecord(record2);

      const records = useNutritionStore.getState().mealRecords;
      expect(records[0].id).toBe("second");
      expect(records[1].id).toBe("first");
    });

    it("식사 기록을 삭제할 수 있다", () => {
      const record = makeMealRecord({ id: "to-delete" });
      useNutritionStore.getState().addMealRecord(record);
      expect(useNutritionStore.getState().mealRecords).toHaveLength(1);

      useNutritionStore.getState().removeMealRecord("to-delete");
      expect(useNutritionStore.getState().mealRecords).toHaveLength(0);
    });

    it("존재하지 않는 ID로 삭제해도 에러가 나지 않는다", () => {
      const record = makeMealRecord({ id: "existing" });
      useNutritionStore.getState().addMealRecord(record);

      useNutritionStore.getState().removeMealRecord("non-existent");
      expect(useNutritionStore.getState().mealRecords).toHaveLength(1);
    });
  });

  describe("updateMealRecord", () => {
    it("기존 기록의 mealType을 업데이트할 수 있다", () => {
      const record = makeMealRecord({ id: "update-me", mealType: "lunch" });
      useNutritionStore.getState().addMealRecord(record);

      useNutritionStore.getState().updateMealRecord("update-me", { mealType: "dinner" });
      const updated = useNutritionStore.getState().mealRecords[0];
      expect(updated.mealType).toBe("dinner");
    });
  });

  describe("getTodayNutrition", () => {
    it("오늘 기록이 없으면 모든 값이 0이다", () => {
      const nutrition = useNutritionStore.getState().getTodayNutrition();
      expect(nutrition).toEqual({
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        phenylalanine_mg: 0,
      });
    });

    it("오늘 기록의 영양소를 합산한다", () => {
      const record1 = makeMealRecord({
        totalNutrition: { calories: 300, protein_g: 10, carbs_g: 40, fat_g: 8, phenylalanine_mg: 50 },
      });
      const record2 = makeMealRecord({
        totalNutrition: { calories: 400, protein_g: 15, carbs_g: 50, fat_g: 12, phenylalanine_mg: 80 },
      });

      useNutritionStore.getState().addMealRecord(record1);
      useNutritionStore.getState().addMealRecord(record2);

      const nutrition = useNutritionStore.getState().getTodayNutrition();
      expect(nutrition.calories).toBe(700);
      expect(nutrition.protein_g).toBe(25);
      expect(nutrition.phenylalanine_mg).toBe(130);
    });

    it("과거 기록은 합산에 포함하지 않는다", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const todayRecord = makeMealRecord({
        totalNutrition: { calories: 300, protein_g: 10, carbs_g: 40, fat_g: 8, phenylalanine_mg: 50 },
      });
      const yesterdayRecord = makeMealRecord({
        timestamp: yesterday.toISOString(),
        totalNutrition: { calories: 999, protein_g: 99, carbs_g: 99, fat_g: 99, phenylalanine_mg: 999 },
      });

      useNutritionStore.getState().addMealRecord(todayRecord);
      useNutritionStore.getState().addMealRecord(yesterdayRecord);

      const nutrition = useNutritionStore.getState().getTodayNutrition();
      expect(nutrition.calories).toBe(300);
      expect(nutrition.phenylalanine_mg).toBe(50);
    });
  });

  describe("Exchange 계산", () => {
    it("getExchanges: 1 Exchange = 50mg Phe", () => {
      const state = useNutritionStore.getState();
      expect(state.getExchanges(50)).toBe(1);
      expect(state.getExchanges(100)).toBe(2);
      expect(state.getExchanges(75)).toBe(1.5);
      expect(state.getExchanges(0)).toBe(0);
    });

    it("getExchangeGoal: dailyGoals 기반 Exchange 목표", () => {
      useNutritionStore.getState().setDailyGoals({ phenylalanine_mg: 300 });
      expect(useNutritionStore.getState().getExchangeGoal()).toBe(6);

      useNutritionStore.getState().setDailyGoals({ phenylalanine_mg: 400 });
      expect(useNutritionStore.getState().getExchangeGoal()).toBe(8);
    });

    it("getTodayExchanges: 오늘 섭취한 Exchange 합계", () => {
      const record = makeMealRecord({
        totalNutrition: { calories: 300, protein_g: 10, carbs_g: 40, fat_g: 8, phenylalanine_mg: 150 },
      });
      useNutritionStore.getState().addMealRecord(record);

      expect(useNutritionStore.getState().getTodayExchanges()).toBe(3);
    });
  });

  describe("수분 섭취", () => {
    it("addWaterGlass / removeWaterGlass가 동작한다", () => {
      const store = useNutritionStore.getState();
      expect(store.getTodayWaterIntake()).toBe(0);

      store.addWaterGlass();
      expect(useNutritionStore.getState().getTodayWaterIntake()).toBe(1);

      useNutritionStore.getState().addWaterGlass();
      expect(useNutritionStore.getState().getTodayWaterIntake()).toBe(2);

      useNutritionStore.getState().removeWaterGlass();
      expect(useNutritionStore.getState().getTodayWaterIntake()).toBe(1);
    });

    it("수분 섭취는 0 아래로 내려가지 않는다", () => {
      useNutritionStore.getState().removeWaterGlass();
      expect(useNutritionStore.getState().getTodayWaterIntake()).toBe(0);
    });
  });

  describe("온보딩/퀵셋업 상태", () => {
    it("setQuickSetupCompleted 동작", () => {
      useNutritionStore.getState().setQuickSetupCompleted(true);
      expect(useNutritionStore.getState().quickSetupCompleted).toBe(true);
    });

    it("setOnboardingCompleted 동작", () => {
      useNutritionStore.getState().setOnboardingCompleted(true);
      expect(useNutritionStore.getState().onboardingCompleted).toBe(true);
    });

    it("setDiagnosisAgeGroup 동작", () => {
      useNutritionStore.getState().setDiagnosisAgeGroup("infant");
      expect(useNutritionStore.getState().diagnosisAgeGroup).toBe("infant");
    });
  });

  describe("getNutritionByDate / getMealsByDate", () => {
    it("특정 날짜의 영양소를 조회할 수 있다", () => {
      const targetDate = new Date(2025, 0, 15); // 2025-01-15
      const record = makeMealRecord({
        timestamp: targetDate.toISOString(),
        totalNutrition: { calories: 500, protein_g: 20, carbs_g: 60, fat_g: 15, phenylalanine_mg: 100 },
      });
      useNutritionStore.getState().addMealRecord(record);

      const nutrition = useNutritionStore.getState().getNutritionByDate(targetDate);
      expect(nutrition.calories).toBe(500);
      expect(nutrition.phenylalanine_mg).toBe(100);
    });

    it("특정 날짜의 식사 목록을 조회할 수 있다", () => {
      const targetDate = new Date(2025, 0, 15);
      const record = makeMealRecord({ timestamp: targetDate.toISOString() });
      useNutritionStore.getState().addMealRecord(record);

      const meals = useNutritionStore.getState().getMealsByDate(targetDate);
      expect(meals).toHaveLength(1);
    });
  });
});
