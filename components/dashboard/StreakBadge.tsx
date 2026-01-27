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
      icon: "🔥",
      text: "text-white",
    },
    at_risk: {
      bg: "bg-gradient-to-r from-yellow-400 to-orange-400",
      icon: "⚠️",
      text: "text-white",
    },
    broken: {
      bg: "bg-gray-200",
      icon: "💨",
      text: "text-gray-600",
    },
  };

  const style = statusStyles[status];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${style.bg} ${style.text} font-medium text-sm`}
      >
        <span>{style.icon}</span>
        <span>{currentStreak}</span>
        <span className="text-xs opacity-80">{t("days")}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 스트릭 아이콘 */}
          <div
            className={`w-14 h-14 rounded-full ${style.bg} flex items-center justify-center text-2xl`}
          >
            {style.icon}
          </div>

          {/* 스트릭 정보 */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{currentStreak}</span>
              <span className="text-gray-500">{t("dayStreak")}</span>
            </div>
            <p className="text-sm text-gray-500">
              {status === "active" && t("keepGoing")}
              {status === "at_risk" && t("logTodayToKeep")}
              {status === "broken" && t("startNewStreak")}
            </p>
          </div>
        </div>

        {/* 최장 스트릭 */}
        <div className="text-right">
          <p className="text-sm text-gray-400">{t("longest")}</p>
          <p className="text-xl font-semibold text-gray-700">
            {longestStreak} {t("days")}
          </p>
        </div>
      </div>

      {/* 진행률 바 (7일 기준) */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{t("weeklyGoal")}</span>
          <span>{Math.min(currentStreak, 7)}/7</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${style.bg} transition-all duration-500`}
            style={{ width: `${Math.min((currentStreak / 7) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* 스트릭 마일스톤 */}
      {currentStreak > 0 && (currentStreak === 7 || currentStreak === 30 || currentStreak === 100) && (
        <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-center">
          <span className="text-lg">🏆</span>
          <span className="ml-2 text-sm font-medium text-yellow-700">
            {currentStreak} {t("dayMilestone")}
          </span>
        </div>
      )}
    </div>
  );
}
