"use client";

import { useTranslations } from "next-intl";

interface NutrientRingProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  warning?: boolean;
  // PKU Exchange 표시 (optional)
  exchangeValue?: number;
  exchangeGoal?: number;
}

export default function NutrientRing({
  label,
  current,
  goal,
  unit,
  color,
  warning = false,
  exchangeValue,
  exchangeGoal,
}: NutrientRingProps) {
  const t = useTranslations("NutrientRing");
  const tNutrients = useTranslations("Nutrients");
  const percentage = Math.min((current / goal) * 100, 100);
  const isOverLimit = current > goal;
  const displayColor = isOverLimit && warning ? "var(--pku-danger)" : color;
  const hasExchange = exchangeValue !== undefined && exchangeGoal !== undefined;

  // SVG 원형 프로그레스 계산
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          {/* 배경 원 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          {/* 진행률 원 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={displayColor}
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-lg font-bold"
            style={{ color: displayColor }}
          >
            {Math.round(current)}
          </span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">
        {t("goal")}: {goal}
        {unit}
      </span>
      {isOverLimit && warning && (
        <span className="text-xs text-red-500 font-semibold mt-1">
          {t("exceeded")}
        </span>
      )}
      {hasExchange && (
        <div className="mt-1 px-2 py-0.5 bg-indigo-100 rounded-full">
          <span className="text-xs font-medium text-indigo-700">
            {exchangeValue} / {exchangeGoal} {tNutrients("exchanges")}
          </span>
        </div>
      )}
    </div>
  );
}
