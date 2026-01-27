"use client";

import { useTranslations } from "next-intl";
import { useNutritionStore } from "@/hooks/useNutritionStore";

interface WaterTrackerProps {
  compact?: boolean;
}

export default function WaterTracker({ compact = false }: WaterTrackerProps) {
  const t = useTranslations("Water");
  const { waterGoal, getTodayWaterIntake, addWaterGlass, removeWaterGlass } = useNutritionStore();

  const todayIntake = getTodayWaterIntake();
  const percentage = Math.min((todayIntake / waterGoal) * 100, 100);
  const isGoalMet = todayIntake >= waterGoal;
  const mlConsumed = todayIntake * 250;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={addWaterGlass}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
        >
          <span>💧</span>
          <span>{todayIntake}/{waterGoal}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">{t("title")}</h3>
        <span className="text-sm text-gray-500">
          {mlConsumed}ml / {waterGoal * 250}ml
        </span>
      </div>

      {/* 물잔 시각화 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: waterGoal }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index < todayIntake) {
                removeWaterGlass();
              } else {
                addWaterGlass();
              }
            }}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-xl
              transition-all transform active:scale-95
              ${
                index < todayIntake
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-300 hover:bg-blue-100"
              }
            `}
            aria-label={`Glass ${index + 1}`}
          >
            💧
          </button>
        ))}
      </div>

      {/* 진행률 바 */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isGoalMet ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 상태 메시지 */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {isGoalMet ? (
            <span className="text-green-600 font-medium">🎉 {t("goalReached")}</span>
          ) : (
            <span>
              {t("remaining", { count: waterGoal - todayIntake })}
            </span>
          )}
        </p>

        {/* 빠른 추가 버튼 */}
        <button
          onClick={addWaterGlass}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("addGlass")}
        </button>
      </div>

      {/* PKU 팁 */}
      <p className="mt-3 text-xs text-gray-400">
        💡 {t("pkuTip")}
      </p>
    </div>
  );
}
