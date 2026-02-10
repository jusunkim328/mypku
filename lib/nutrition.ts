/**
 * 영양소 계산 유틸리티
 */
import type { FoodItem, NutritionData } from "@/types/nutrition";

/**
 * FoodItem 배열의 총 영양소 합산
 */
export function calculateTotalNutrition(items: FoodItem[]): NutritionData {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein_g: acc.protein_g + item.nutrition.protein_g,
      carbs_g: acc.carbs_g + item.nutrition.carbs_g,
      fat_g: acc.fat_g + item.nutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
  );
}

/**
 * Phe 표시용 포맷: 반올림 + null/undefined 안전 처리
 */
export function formatPhe(phe_mg: number | undefined | null): number {
  return Math.round(phe_mg || 0);
}
