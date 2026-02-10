"use client";

import { useTranslations } from "next-intl";
import { umolToMgDl, type BloodUnit } from "@/hooks/useBloodLevels";

interface BloodLevelTargetProps {
  value: number; // normalized µmol/L
  targetMin: number; // µmol/L
  targetMax: number; // µmol/L
  displayUnit?: BloodUnit;
}

export default function BloodLevelTarget({
  value,
  targetMin,
  targetMax,
  displayUnit = "umol",
}: BloodLevelTargetProps) {
  const t = useTranslations("BloodLevels");

  // 시각화 범위: 0 ~ targetMax * 2 (또는 최소 600)
  const maxRange = Math.max(targetMax * 2, 600);
  const valuePercent = Math.min((value / maxRange) * 100, 100);
  const minPercent = (targetMin / maxRange) * 100;
  const maxPercent = (targetMax / maxRange) * 100;

  const isLow = value < targetMin;
  const isHigh = value > targetMax;
  const isNormal = !isLow && !isHigh;

  // 표시 단위에 맞게 변환
  const displayMin = displayUnit === "mg_dl" ? umolToMgDl(targetMin) : targetMin;
  const displayMax = displayUnit === "mg_dl" ? umolToMgDl(targetMax) : targetMax;
  const displayMaxRange = displayUnit === "mg_dl" ? umolToMgDl(maxRange) : maxRange;
  const unitLabel = displayUnit === "mg_dl" ? "mg/dL" : t("umolUnit");

  return (
    <div className="space-y-1.5">
      {/* 범위 바 */}
      <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {/* 목표 범위 영역 */}
        <div
          className="absolute top-0 bottom-0 bg-green-100 dark:bg-green-900/30"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />

        {/* 값 마커 */}
        <div
          className="absolute top-0.5 bottom-0.5 w-3 rounded-full shadow-md transition-all duration-300"
          style={{
            left: `calc(${valuePercent}% - 6px)`,
            backgroundColor: isNormal
              ? "rgb(34, 197, 94)"
              : isLow
              ? "rgb(59, 130, 246)"
              : "rgb(239, 68, 68)",
          }}
        />
      </div>

      {/* 라벨 */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>0</span>
        <span className="text-green-600 dark:text-green-400">
          {displayMin}–{displayMax} {unitLabel}
        </span>
        <span>{Math.round(displayMaxRange)}+</span>
      </div>

      {/* 상태 메시지 */}
      <p
        className={`text-xs font-medium text-center ${
          isNormal
            ? "text-green-600 dark:text-green-400"
            : isLow
            ? "text-blue-600 dark:text-blue-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {isNormal ? t("inRange") : isLow ? t("belowRange") : t("aboveRange")}
      </p>
    </div>
  );
}
