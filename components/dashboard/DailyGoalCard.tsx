"use client";

import { useTranslations } from "next-intl";
import { Card, Progressbar } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";

export default function DailyGoalCard() {
  const t = useTranslations("DailyGoal");
  const tNutrients = useTranslations("Nutrients");
  const { mode, getTodayNutrition, dailyGoals, mealRecords } = useNutritionStore();
  const isPKU = mode === "pku";

  // mealRecords가 변경될 때마다 다시 계산됨
  const todayNutrition = getTodayNutrition();

  const nutrients = [
    {
      name: isPKU ? tNutrients("phenylalanine") : tNutrients("calories"),
      current: isPKU
        ? todayNutrition.phenylalanine_mg || 0
        : todayNutrition.calories,
      goal: isPKU ? dailyGoals.phenylalanine_mg || 300 : dailyGoals.calories,
      unit: isPKU ? "mg" : "kcal",
      warning: isPKU,
    },
    {
      name: tNutrients("protein"),
      current: todayNutrition.protein_g,
      goal: dailyGoals.protein_g,
      unit: "g",
      warning: false,
    },
    {
      name: tNutrients("carbs"),
      current: todayNutrition.carbs_g,
      goal: dailyGoals.carbs_g,
      unit: "g",
      warning: false,
    },
    {
      name: tNutrients("fat"),
      current: todayNutrition.fat_g,
      goal: dailyGoals.fat_g,
      unit: "g",
      warning: false,
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold mb-3">{t("title")}</h3>
      <div className="space-y-3">
        {nutrients.map((nutrient) => {
          const percentage = Math.min(
            (nutrient.current / nutrient.goal) * 100,
            100
          );
          const isOver = nutrient.current > nutrient.goal;

          return (
            <div key={nutrient.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{nutrient.name}</span>
                <span
                  className={
                    isOver && nutrient.warning
                      ? "text-red-500 font-semibold"
                      : "text-gray-800"
                  }
                >
                  {Math.round(nutrient.current)} / {nutrient.goal}
                  {nutrient.unit}
                </span>
              </div>
              <Progressbar progress={percentage / 100} warning={nutrient.warning} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
