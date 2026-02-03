"use client";

import { useTranslations } from "next-intl";
import { Card, Progressbar } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMealRecords } from "@/hooks/useMealRecords";

export default function DailyGoalCard() {
  const t = useTranslations("DailyGoal");
  const tNutrients = useTranslations("Nutrients");
  const { mode, dailyGoals } = useUserSettings();
  const { getTodayNutrition } = useMealRecords();
  const isPKU = mode === "pku";

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
      color: "primary",
    },
    {
      name: tNutrients("protein"),
      current: todayNutrition.protein_g,
      goal: dailyGoals.protein_g,
      unit: "g",
      warning: false,
      color: "accent",
    },
    {
      name: tNutrients("carbs"),
      current: todayNutrition.carbs_g,
      goal: dailyGoals.carbs_g,
      unit: "g",
      warning: false,
      color: "success",
    },
    {
      name: tNutrients("fat"),
      current: todayNutrition.fat_g,
      goal: dailyGoals.fat_g,
      unit: "g",
      warning: false,
      color: "info",
    },
  ];

  return (
    <Card className="p-5 md:p-6 lg:p-8">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 lg:mb-6">
        {t("title")}
      </h3>
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:space-y-0 lg:gap-y-4">
        {nutrients.map((nutrient, index) => {
          const percentage = Math.min(
            (nutrient.current / nutrient.goal) * 100,
            100
          );
          const isOver = nutrient.current > nutrient.goal;

          return (
            <div
              key={nutrient.name}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {nutrient.name}
                </span>
                <span
                  className={`font-semibold ${
                    isOver && nutrient.warning
                      ? "text-red-500 dark:text-red-400"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {Math.round(nutrient.current)}
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    {" "}/ {nutrient.goal}{nutrient.unit}
                  </span>
                </span>
              </div>
              <Progressbar
                progress={percentage / 100}
                warning={nutrient.warning}
                showGlow={percentage >= 80 && percentage < 100 && !isOver}
              />
              {isOver && nutrient.warning && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium animate-pulse">
                  {t("exceeded") || "Limit exceeded!"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
