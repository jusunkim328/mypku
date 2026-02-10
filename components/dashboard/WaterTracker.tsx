"use client";

import { useTranslations } from "next-intl";
import { Droplets, Plus } from "lucide-react";
import { useWaterRecords } from "@/hooks/useWaterRecords";
import { useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";

interface WaterTrackerProps {
  compact?: boolean;
}

export default function WaterTracker({ compact = false }: WaterTrackerProps) {
  const t = useTranslations("Water");
  const tCg = useTranslations("Caregiver");
  const { todayIntake, waterGoal, addGlass, removeGlass } = useWaterRecords();
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();

  const percentage = Math.min((todayIntake / waterGoal) * 100, 100);
  const isGoalMet = todayIntake >= waterGoal;
  const mlConsumed = todayIntake * 250;
  const viewOnly = isCaregiverMode && !canEdit;

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 p-4 md:p-5 lg:p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isGoalMet ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
              {todayIntake}/{waterGoal}
            </span>
            {!viewOnly && (
              <button
                onClick={addGlass}
                aria-label={t("addGlass")}
                className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 물잔 버튼 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from({ length: waterGoal }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (viewOnly) return;
                if (index < todayIntake) {
                  removeGlass();
                } else {
                  addGlass();
                }
              }}
              disabled={viewOnly}
              className={`
                w-9 h-9 rounded-lg flex items-center justify-center text-base
                transition-all transform
                ${viewOnly ? "cursor-not-allowed opacity-60" : "active:scale-95"}
                ${
                  index < todayIntake
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                }
              `}
              aria-label={`Glass ${index + 1}`}
            >
              💧
            </button>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isGoalMet ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* 완료 메시지 */}
        {isGoalMet && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium text-center">
            🎉 {t("goalReached")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 p-4 md:p-5 lg:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {mlConsumed}ml / {waterGoal * 250}ml
        </span>
      </div>

      {/* view-only 알림 */}
      {viewOnly && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          {tCg("noEditPermission")}
        </p>
      )}

      {/* 물잔 시각화 */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
        {Array.from({ length: waterGoal }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (viewOnly) return;
              if (index < todayIntake) {
                removeGlass();
              } else {
                addGlass();
              }
            }}
            disabled={viewOnly}
            className={`
              w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl
              transition-all transform
              ${viewOnly ? "cursor-not-allowed opacity-60" : "active:scale-95"}
              ${
                index < todayIntake
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              }
            `}
            aria-label={`Glass ${index + 1}`}
          >
            💧
          </button>
        ))}
      </div>

      {/* 진행률 바 */}
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isGoalMet ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 상태 메시지 */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isGoalMet ? (
            <span className="text-green-600 dark:text-green-400 font-medium">🎉 {t("goalReached")}</span>
          ) : (
            <span>
              {t("remaining", { count: waterGoal - todayIntake })}
            </span>
          )}
        </p>

        {/* 빠른 추가 버튼 */}
        <button
          onClick={addGlass}
          disabled={viewOnly}
          aria-label={t("addGlass")}
          className={`flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium transition-colors ${
            viewOnly ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
        >
          <Plus className="w-4 h-4" />
          {t("addGlass")}
        </button>
      </div>

      {/* PKU 팁 */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {t("pkuTip")}
      </p>
    </div>
  );
}
