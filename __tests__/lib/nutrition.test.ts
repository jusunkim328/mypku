import { describe, it, expect } from "vitest";
import { calculateTotalNutrition, formatPhe } from "@/lib/nutrition";
import type { FoodItem } from "@/types/nutrition";

const makeFoodItem = (overrides: Partial<FoodItem["nutrition"]> & { name?: string }): FoodItem => ({
  id: "test-1",
  name: overrides.name || "Test Food",
  estimatedWeight_g: 100,
  nutrition: {
    calories: overrides.calories ?? 100,
    protein_g: overrides.protein_g ?? 5,
    carbs_g: overrides.carbs_g ?? 20,
    fat_g: overrides.fat_g ?? 3,
    phenylalanine_mg: overrides.phenylalanine_mg ?? 50,
  },
  confidence: 0.9,
  userVerified: false,
  pkuSafety: "caution",
  exchanges: 1,
});

describe("calculateTotalNutrition", () => {
  it("빈 배열 → 모두 0", () => {
    const result = calculateTotalNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      phenylalanine_mg: 0,
    });
  });

  it("단일 아이템 합산", () => {
    const result = calculateTotalNutrition([
      makeFoodItem({ calories: 200, protein_g: 10, phenylalanine_mg: 80 }),
    ]);
    expect(result.calories).toBe(200);
    expect(result.protein_g).toBe(10);
    expect(result.phenylalanine_mg).toBe(80);
  });

  it("복수 아이템 합산", () => {
    const result = calculateTotalNutrition([
      makeFoodItem({ calories: 100, phenylalanine_mg: 30 }),
      makeFoodItem({ calories: 200, phenylalanine_mg: 50 }),
    ]);
    expect(result.calories).toBe(300);
    expect(result.phenylalanine_mg).toBe(80);
  });
});

describe("formatPhe", () => {
  it("정수 반환", () => {
    expect(formatPhe(123.456)).toBe(123);
  });

  it("반올림", () => {
    expect(formatPhe(99.7)).toBe(100);
  });

  it("null → 0", () => {
    expect(formatPhe(null)).toBe(0);
  });

  it("undefined → 0", () => {
    expect(formatPhe(undefined)).toBe(0);
  });

  it("0 → 0", () => {
    expect(formatPhe(0)).toBe(0);
  });
});
