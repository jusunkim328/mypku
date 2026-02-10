"use client";

import { useTranslations } from "next-intl";

interface NutrientRingProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  warning?: boolean;
  exchangeValue?: number;
  exchangeGoal?: number;
}

export default function NutrientRing({
  label,
  current,
  goal,
  unit,
  color: _color,
  warning = false,
  exchangeValue,
  exchangeGoal,
}: NutrientRingProps) {
  const t = useTranslations("NutrientRing");
  const tNutrients = useTranslations("Nutrients");
  const safeCurrent = isNaN(current) ? 0 : current;
  const percentage = goal > 0 ? Math.min((safeCurrent / goal) * 100, 100) : 0;
  const isOverLimit = current > goal;
  const hasExchange = exchangeValue !== undefined && exchangeGoal !== undefined;

  // SVG 원형 프로그레스 계산
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // 색상 결정
  const getGradientId = () => {
    if (isOverLimit && warning) return "gradient-danger";
    if (isOverLimit) return "gradient-warning";
    return "gradient-primary";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32">
        {/* SVG 그라데이션 정의 */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96" role="img" aria-label={`${label}: ${Math.round(safeCurrent)} of ${goal}${unit}`}>
          <defs>
            <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--pku-primary-400)" />
              <stop offset="100%" stopColor="var(--pku-primary-600)" />
            </linearGradient>
            <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--pku-accent-400)" />
              <stop offset="100%" stopColor="var(--pku-accent-600)" />
            </linearGradient>
            <linearGradient id="gradient-danger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* 배경 원 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="8"
            fill="transparent"
          />

          {/* 진행률 원 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={`url(#${getGradientId()})`}
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
            filter={isOverLimit && warning ? "url(#glow)" : undefined}
            style={{
              filter: isOverLimit && warning ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))" : undefined
            }}
          />
        </svg>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-lg md:text-xl lg:text-2xl font-bold transition-colors duration-300 ${
              isOverLimit && warning
                ? "text-red-500 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {Math.round(safeCurrent)}
          </span>
          <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{unit}</span>
        </div>
      </div>

      <span className="mt-2 text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
        {t("goal")}: {goal}
        {unit}
      </span>

      {isOverLimit && warning && (
        <span className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1 animate-pulse">
          {t("exceeded")}
        </span>
      )}

      {hasExchange && (
        <div className="mt-1 px-2.5 py-1 bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-full border border-primary-200 dark:border-primary-700">
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
            {exchangeValue} / {exchangeGoal} {tNutrients("exchanges")}
          </span>
        </div>
      )}
    </div>
  );
}
