"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import FoodItemCard from "./FoodItemCard";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { FoodItem, NutritionData } from "@/types/nutrition";

interface AnalysisResultProps {
  items: FoodItem[];
  totalNutrition: NutritionData;
  onItemUpdate: (id: string, updates: Partial<FoodItem>) => void;
}

export default function AnalysisResult({
  items,
  totalNutrition,
  onItemUpdate,
}: AnalysisResultProps) {
  const t = useTranslations("AnalyzePage");
  const tNutrients = useTranslations("Nutrients");
  const { mode } = useNutritionStore();
  const isPKU = mode === "pku";

  return (
    <div className="space-y-4">
      {/* 총 영양소 요약 */}
      <Card className="p-4 bg-indigo-50">
        <h3 className="text-base font-semibold mb-3 text-indigo-900">
          {t("analysisSummary")}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {isPKU && (
            <div className="col-span-2 bg-white rounded-lg p-3">
              <span className="text-gray-600">{t("estimatedPhe")}</span>
              <p className="text-xl font-bold text-indigo-600">
                {totalNutrition.phenylalanine_mg}mg
              </p>
            </div>
          )}
          <div className="bg-white rounded-lg p-3">
            <span className="text-gray-600">{tNutrients("calories")}</span>
            <p className="text-lg font-semibold">
              {Math.round(totalNutrition.calories)}kcal
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-gray-600">{tNutrients("protein")}</span>
            <p className="text-lg font-semibold">
              {totalNutrition.protein_g.toFixed(1)}g
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-gray-600">{tNutrients("carbs")}</span>
            <p className="text-lg font-semibold">
              {totalNutrition.carbs_g.toFixed(1)}g
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-gray-600">{tNutrients("fat")}</span>
            <p className="text-lg font-semibold">
              {totalNutrition.fat_g.toFixed(1)}g
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {t("aiDisclaimer")}
        </p>
      </Card>

      {/* 개별 음식 항목 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 px-1">
          {t("recognizedFoods")} ({items.length}{t("items")})
        </h3>
        {items.map((item) => (
          <FoodItemCard
            key={item.id}
            item={item}
            onUpdate={(updates) => onItemUpdate(item.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}
