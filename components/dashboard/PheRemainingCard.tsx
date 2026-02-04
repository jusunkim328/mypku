"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface PheRemainingCardProps {
  used: number;
  goal: number;
  exchangeUsed: number;
  exchangeGoal: number;
}

export default function PheRemainingCard({
  used,
  goal,
  exchangeUsed,
  exchangeGoal,
}: PheRemainingCardProps) {
  const t = useTranslations("PheRemaining");
  const tNutrients = useTranslations("Nutrients");

  const remaining = Math.max(goal - used, 0);
  const exchangeRemaining = Math.max(exchangeGoal - exchangeUsed, 0);
  const percentage = Math.min((used / goal) * 100, 100);
  const isOverLimit = used > goal;
  const isNearLimit = percentage >= 80 && !isOverLimit;

  // 프로그레스 바 색상 (녹→노→빨)
  const getProgressColor = () => {
    if (isOverLimit) return "bg-gradient-to-r from-red-500 to-red-600";
    if (percentage >= 80) return "bg-gradient-to-r from-amber-400 to-amber-500";
    if (percentage >= 50) return "bg-gradient-to-r from-yellow-400 to-yellow-500";
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  };

  // 배경 색상
  const getBackgroundColor = () => {
    if (isOverLimit) return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    if (isNearLimit) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    return "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700";
  };

  // 상태 아이콘
  const StatusIcon = () => {
    if (isOverLimit) {
      return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
    }
    if (isNearLimit) {
      return <TrendingUp className="w-5 h-5 text-amber-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <Card className={`p-4 md:p-5 border-2 transition-colors ${getBackgroundColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <StatusIcon />
          {t("title")}
        </h3>
        {isOverLimit && (
          <span className="text-xs font-bold text-red-500 dark:text-red-400 animate-pulse">
            {t("exceeded")}
          </span>
        )}
        {isNearLimit && !isOverLimit && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {t("nearLimit")}
          </span>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {/* 100% 마커 */}
        <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-400 dark:bg-gray-500" />
      </div>

      {/* 수치 표시 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* 사용량 */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("used")}</p>
          <p className={`text-lg font-bold ${isOverLimit ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
            {Math.round(used)}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {exchangeUsed.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>

        {/* 잔여량 */}
        <div className="space-y-1 border-x border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("remaining")}</p>
          <p className={`text-xl font-bold ${
            isOverLimit
              ? "text-red-500"
              : isNearLimit
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {isOverLimit ? `-${Math.round(used - goal)}` : Math.round(remaining)}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className={`text-xs ${
            isOverLimit
              ? "text-red-400"
              : isNearLimit
                ? "text-amber-500"
                : "text-emerald-500"
          }`}>
            {isOverLimit ? `-${(exchangeUsed - exchangeGoal).toFixed(1)}` : exchangeRemaining.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>

        {/* 허용량 */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("allowance")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {goal}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {exchangeGoal.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>
      </div>

      {/* 퍼센트 표시 */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("dailyProgress")}
        </span>
        <span className={`text-sm font-semibold ${
          isOverLimit
            ? "text-red-500"
            : isNearLimit
              ? "text-amber-600 dark:text-amber-400"
              : "text-gray-700 dark:text-gray-300"
        }`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </Card>
  );
}
