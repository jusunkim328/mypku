"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useStreakStore } from "@/hooks/useStreakStore";
import { useMealRecords } from "@/hooks/useMealRecords";

interface StreakBadgeProps {
  compact?: boolean;
}

export default function StreakBadge({ compact = false }: StreakBadgeProps) {
  const t = useTranslations("Streak");
  const { currentStreak, longestStreak, getStreakStatus, calculateStreak, _hasHydrated } = useStreakStore();
  const { mealRecords } = useMealRecords();

  // 식사 기록이 변경되면 스트릭 재계산
  useEffect(() => {
    if (_hasHydrated && mealRecords.length > 0) {
      const logDates = mealRecords.map((record) =>
        new Date(record.timestamp).toISOString().split("T")[0]
      );
      calculateStreak(logDates);
    }
  }, [mealRecords, _hasHydrated]);

  const status = getStreakStatus();

  // 스트릭 상태에 따른 스타일
  const statusStyles = {
    active: {
      bg: "bg-gradient-to-r from-orange-400 to-red-500",
      iconBg: "bg-gradient-to-br from-orange-400 to-red-500",
      icon: "🔥",
      text: "text-white",
      ring: "ring-orange-300 dark:ring-orange-600",
    },
    at_risk: {
      bg: "bg-gradient-to-r from-yellow-400 to-orange-400",
      iconBg: "bg-gradient-to-br from-yellow-400 to-orange-400",
      icon: "⚠️",
      text: "text-white",
      ring: "ring-yellow-300 dark:ring-yellow-600",
    },
    broken: {
      bg: "bg-gray-200 dark:bg-gray-700",
      iconBg: "bg-gray-200 dark:bg-gray-700",
      icon: "💨",
      text: "text-gray-600 dark:text-gray-300",
      ring: "ring-gray-200 dark:ring-gray-600",
    },
  };

  const style = statusStyles[status];

  if (compact) {
    return (
      <div
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
          ${style.bg} ${style.text} font-semibold text-sm
          shadow-md hover:shadow-lg transition-all duration-200
        `}
      >
        <span className={status === "active" ? "animate-flame" : ""}>{style.icon}</span>
        <span>{currentStreak}</span>
        <span className="text-xs opacity-80">{t("days")}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900/80 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-800 p-4 hover:shadow-soft-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 스트릭 아이콘 */}
          <div
            className={`
              w-16 h-16 rounded-2xl ${style.iconBg}
              flex items-center justify-center text-3xl
              shadow-lg ring-4 ${style.ring}
              ${status === "active" ? "animate-bounce-in" : ""}
            `}
          >
            <span className={status === "active" ? "animate-flame" : ""}>
              {style.icon}
            </span>
          </div>

          {/* 스트릭 정보 */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {currentStreak}
              </span>
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t("dayStreak")}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {status === "active" && t("keepGoing")}
              {status === "at_risk" && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {t("logTodayToKeep")}
                </span>
              )}
              {status === "broken" && t("startNewStreak")}
            </p>
          </div>
        </div>

        {/* 최장 스트릭 */}
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {t("longest")}
          </p>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {longestStreak}
            <span className="text-sm font-normal ml-1">{t("days")}</span>
          </p>
        </div>
      </div>

      {/* 진행률 바 (7일 기준) */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          <span className="font-medium">{t("weeklyGoal")}</span>
          <span className="font-semibold">{Math.min(currentStreak, 7)}/7</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-700 ease-out
              ${style.bg}
              ${status === "active" ? "shadow-glow-accent" : ""}
            `}
            style={{ width: `${Math.min((currentStreak / 7) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* 스트릭 마일스톤 */}
      {currentStreak > 0 && (currentStreak === 7 || currentStreak === 30 || currentStreak === 100) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 text-center animate-bounce-in">
          <span className="text-2xl">🏆</span>
          <span className="ml-2 text-sm font-semibold text-yellow-700 dark:text-yellow-300">
            {currentStreak} {t("dayMilestone")}
          </span>
        </div>
      )}
    </div>
  );
}
