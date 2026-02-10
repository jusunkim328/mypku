"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import NutrientRing from "./NutrientRing";

interface TodaySummaryCardProps {
  pheUsed: number;
  pheGoal: number;
  exchangeUsed: number;
  exchangeGoal: number;
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
}

export default function TodaySummaryCard({
  pheUsed,
  pheGoal,
  exchangeUsed,
  exchangeGoal,
  calories,
  protein,
  carbs,
}: TodaySummaryCardProps) {
  const t = useTranslations("TodaySummary");
  const tPhe = useTranslations("PheRemaining");
  const tNutrients = useTranslations("Nutrients");

  const remaining = Math.max(pheGoal - pheUsed, 0);
  const exchangeRemaining = Math.max(exchangeGoal - exchangeUsed, 0);
  const percentage = pheGoal > 0 ? Math.min((pheUsed / pheGoal) * 100, 100) : 0;
  const isOverLimit = pheGoal > 0 && pheUsed > pheGoal;
  const isNearLimit = percentage >= 80 && !isOverLimit;

  const statusTextColor = (over: string, near: string, def: string) =>
    isOverLimit ? over : isNearLimit ? near : def;

  const getProgressColor = () => {
    if (isOverLimit) return "bg-gradient-to-r from-red-500 to-red-600";
    if (percentage >= 80) return "bg-gradient-to-r from-amber-400 to-amber-500";
    if (percentage >= 50) return "bg-gradient-to-r from-yellow-400 to-yellow-500";
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  };

  const getBorderColor = () => {
    if (isOverLimit) return "border-red-200 dark:border-red-800";
    if (isNearLimit) return "border-amber-200 dark:border-amber-800";
    return "border-gray-100 dark:border-gray-800";
  };

  const StatusIcon = () => {
    if (isOverLimit) return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
    if (isNearLimit) return <TrendingUp className="w-5 h-5 text-amber-500" />;
    return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <Card className={`p-4 md:p-5 border-2 transition-colors ${getBorderColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <StatusIcon />
          {t("title")}
        </h3>
        {isOverLimit && (
          <span className="text-xs font-bold text-red-500 dark:text-red-400 animate-pulse">
            {tPhe("exceeded")}
          </span>
        )}
        {isNearLimit && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {tPhe("nearLimit")}
          </span>
        )}
      </div>

      {/* Phe Progress Bar */}
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-400 dark:bg-gray-500" />
      </div>

      {/* Phe Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{tPhe("used")}</p>
          <p className={`text-lg font-bold ${isOverLimit ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
            {Math.round(pheUsed)}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {exchangeUsed.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>

        <div className="space-y-1 border-x border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">{tPhe("remaining")}</p>
          <p className={`text-xl font-bold ${statusTextColor("text-red-500", "text-amber-600 dark:text-amber-400", "text-emerald-600 dark:text-emerald-400")}`}>
            {isOverLimit ? `-${Math.round(pheUsed - pheGoal)}` : Math.round(remaining)}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className={`text-xs ${statusTextColor("text-red-400", "text-amber-500", "text-emerald-500")}`}>
            {isOverLimit ? `-${(exchangeUsed - exchangeGoal).toFixed(1)}` : exchangeRemaining.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{tPhe("allowance")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {pheGoal}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {exchangeGoal.toFixed(1)} {tNutrients("exchange")}
          </p>
        </div>
      </div>

      {/* Percent footer */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {tPhe("dailyProgress")}
        </span>
        <span className={`text-sm font-semibold ${statusTextColor("text-red-500", "text-amber-600 dark:text-amber-400", "text-gray-700 dark:text-gray-300")}`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Nutrient Rings */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around">
          <NutrientRing
            label={tNutrients("calories")}
            current={calories.current}
            goal={calories.goal}
            unit="kcal"
            color="var(--pku-accent)"
          />
          <NutrientRing
            label={tNutrients("protein")}
            current={protein.current}
            goal={protein.goal}
            unit="g"
            color="var(--pku-secondary)"
          />
          <NutrientRing
            label={tNutrients("carbs")}
            current={carbs.current}
            goal={carbs.goal}
            unit="g"
            color="var(--pku-success)"
          />
        </div>
      </div>
    </Card>
  );
}
