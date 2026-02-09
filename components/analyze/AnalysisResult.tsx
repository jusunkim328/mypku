"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import FoodItemCard from "./FoodItemCard";
import { useUserSettings } from "@/hooks/useUserSettings";
import { formatPhe } from "@/lib/nutrition";
import { getFoodsByPheRange, type PKUFood } from "@/lib/pkuFoodDatabase";
import type { FoodItem, NutritionData } from "@/types/nutrition";

interface AnalysisResultProps {
  items: FoodItem[];
  totalNutrition: NutritionData;
  onItemUpdate: (id: string, updates: Partial<FoodItem>) => void;
  onItemConfirm?: (id: string) => void;
  showConfirmButtons?: boolean;
}

export default function AnalysisResult({
  items,
  totalNutrition,
  onItemUpdate,
  onItemConfirm,
  showConfirmButtons = true,
}: AnalysisResultProps) {
  const t = useTranslations("AnalyzePage");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");
  const { getExchanges, phePerExchange } = useUserSettings();

  // AI가 반환한 총 exchanges 계산 (있으면 사용, 없으면 기존 방식)
  const totalExchanges = Math.round(items.reduce(
    (sum, item) => sum + (item.exchanges ?? getExchanges(item.nutrition.phenylalanine_mg || 0)),
    0
  ) * 10) / 10;

  // 확정된 항목과 미확정 항목 분리
  const confirmedItems = items.filter(item => item.isConfirmed);
  const unconfirmedItems = items.filter(item => !item.isConfirmed);

  // 확정된 항목의 Phe 합계
  const confirmedPhe = confirmedItems.reduce(
    (sum, item) => sum + (item.nutrition.phenylalanine_mg || 0),
    0
  );
  const confirmedExchanges = Math.round(confirmedItems.reduce(
    (sum, item) => sum + (item.exchanges ?? getExchanges(item.nutrition.phenylalanine_mg || 0)),
    0
  ) * 10) / 10;

  // 대체 식품 추천 상태
  const [alternatives, setAlternatives] = useState<PKUFood[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // 고Phe 식품 감지 (pkuSafety 기반 우선, 없으면 기존 방식)
  const hasHighPheFood = items.some((item) => {
    // AI가 반환한 pkuSafety가 있으면 사용
    if (item.pkuSafety) {
      return item.pkuSafety === "caution" || item.pkuSafety === "avoid";
    }
    // 기존 방식: 100g 기준으로 환산하여 체크
    const phePerServing = item.nutrition.phenylalanine_mg || 0;
    const weight = item.estimatedWeight_g || 100;
    const phePer100g = (phePerServing / weight) * 100;
    return phePer100g > 200; // HIGH_PHE_THRESHOLD
  });

  // avoid 식품이 있는지 확인
  const hasAvoidFood = items.some((item) => item.pkuSafety === "avoid");

  // 고Phe 식품이 있으면 대체 식품 로드 (PKU 전용)
  useEffect(() => {
    if (hasHighPheFood && !showAlternatives && alternatives.length === 0) {
      const loadAlternatives = async () => {
        setLoadingAlternatives(true);
        try {
          // 저Phe 식품 조회 (0-50mg/100g)
          const lowPheFoods = await getFoodsByPheRange(0, 50, 6);
          setAlternatives(lowPheFoods);
        } catch (error) {
          console.error("대체 식품 로드 실패:", error);
        } finally {
          setLoadingAlternatives(false);
        }
      };
      loadAlternatives();
    }
  }, [hasHighPheFood, showAlternatives, alternatives.length]);

  return (
    <div className="space-y-4">
      {/* 총 영양소 요약 */}
      <Card className="p-4 md:p-5 lg:p-6 bg-indigo-50 dark:bg-indigo-950/50">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-indigo-900 dark:text-indigo-100">
          {t("analysisSummary")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 text-sm md:text-base">
          {/* Phe 정보 (PKU 전용) */}
          <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4">
            <span className="text-gray-600 dark:text-gray-400">{t("estimatedPhe")}</span>
            <p className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatPhe(totalNutrition.phenylalanine_mg)}mg
            </p>
          </div>
          <div className="col-span-2 md:col-span-1 flex items-center gap-2 p-3 md:p-4 bg-indigo-600 dark:bg-indigo-700 rounded-lg">
            <span className="text-3xl font-bold text-white">
              {totalExchanges}
            </span>
            <div>
              <p className="text-sm font-medium text-white">
                {tNutrients("exchanges")}
              </p>
              <p className="text-xs text-indigo-200">
                1 Exchange = {phePerExchange}mg Phe
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4">
            <span className="text-gray-600 dark:text-gray-400">{tNutrients("calories")}</span>
            <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(totalNutrition.calories)}kcal
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4">
            <span className="text-gray-600 dark:text-gray-400">{tNutrients("protein")}</span>
            <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {totalNutrition.protein_g.toFixed(1)}g
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4">
            <span className="text-gray-600 dark:text-gray-400">{tNutrients("carbs")}</span>
            <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {totalNutrition.carbs_g.toFixed(1)}g
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4">
            <span className="text-gray-600 dark:text-gray-400">{tNutrients("fat")}</span>
            <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {totalNutrition.fat_g.toFixed(1)}g
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {t("aiDisclaimer")}
        </p>

        {/* 확정/미확정 상태 요약 */}
        {showConfirmButtons && unconfirmedItems.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t("unconfirmedWarning", { count: unconfirmedItems.length })}
            </p>
            {confirmedItems.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                {t("confirmedSummary", { phe: confirmedPhe, exchanges: confirmedExchanges })}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* 개별 음식 항목 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">
          {t("recognizedFoods")} ({items.length}{t("items")})
        </h3>
        {items.map((item) => (
          <FoodItemCard
            key={item.id}
            item={item}
            onUpdate={(updates) => onItemUpdate(item.id, updates)}
            onConfirm={onItemConfirm}
            showConfirmButton={showConfirmButtons}
          />
        ))}
      </div>

      {/* 저Phe 대체 식품 추천 (고Phe 식품이 있을 때) */}
      {hasHighPheFood && (
        <Card className={`p-4 ${hasAvoidFood ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <svg
              className={`w-5 h-5 ${hasAvoidFood ? "text-red-600" : "text-amber-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className={`font-semibold ${hasAvoidFood ? "text-red-800" : "text-amber-800"}`}>
              {t("highPheWarning")}
            </span>
          </div>

          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className={`w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm font-medium ${hasAvoidFood ? "text-red-700 hover:bg-red-100" : "text-amber-700 hover:bg-amber-100"} transition-colors`}
          >
            <span>{t("alternatives")}</span>
            <svg
              className={`w-5 h-5 transition-transform ${showAlternatives ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAlternatives && (
            <div className="mt-3 space-y-2">
              <p className={`text-sm ${hasAvoidFood ? "text-red-700" : "text-amber-700"}`}>
                {t("alternativesDesc")}
              </p>

              {loadingAlternatives ? (
                <div className={`text-center py-3 text-sm ${hasAvoidFood ? "text-red-600" : "text-amber-600"}`}>
                  {tCommon("loading")}
                </div>
              ) : alternatives.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {alternatives.map((food) => (
                    <div
                      key={food.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {food.name_ko || food.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {food.serving_size}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          {food.phenylalanine_mg}mg
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Phe</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm text-center py-2 ${hasAvoidFood ? "text-red-600" : "text-amber-600"}`}>
                  {t("noAlternatives")}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
