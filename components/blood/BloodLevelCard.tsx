"use client";

import { useTranslations } from "next-intl";
import { Trash2, FileText, Clock } from "lucide-react";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";
import { umolToMgDl, type BloodUnit } from "@/hooks/useBloodLevels";
import BloodLevelTarget from "./BloodLevelTarget";

interface BloodLevelCardProps {
  record: BloodLevelRecord;
  displayUnit: BloodUnit;
  currentTargetMin: number;
  currentTargetMax: number;
  onDelete: (id: string) => void;
}

export default function BloodLevelCard({
  record,
  displayUnit,
  currentTargetMin,
  currentTargetMax,
  onDelete,
}: BloodLevelCardProps) {
  const t = useTranslations("BloodLevels");

  const displayValue =
    displayUnit === "mg_dl"
      ? umolToMgDl(record.normalizedUmol)
      : record.normalizedUmol;
  const unitLabel = displayUnit === "mg_dl" ? "mg/dL" : "\u00B5mol/L";

  const isLow = record.normalizedUmol < record.targetMin;
  const isHigh = record.normalizedUmol > record.targetMax;
  const isNormal = !isLow && !isHigh;

  const statusColor = isNormal
    ? "text-green-600 dark:text-green-400"
    : isLow
    ? "text-blue-600 dark:text-blue-400"
    : "text-red-600 dark:text-red-400";

  const statusBg = isNormal
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : isLow
    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const date = new Date(record.collectedAt);
  const dateStr = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // 현재 설정과 기록 당시 설정이 다른지 확인
  const isTargetDifferent =
    Math.abs(record.targetMin - currentTargetMin) > 1 ||
    Math.abs(record.targetMax - currentTargetMax) > 1;

  const handleDelete = () => {
    if (window.confirm(t("deleteConfirm"))) {
      onDelete(record.id);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${statusBg}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{dateStr}</p>
          <p className={`text-2xl font-bold ${statusColor}`}>
            {displayValue}
            <span className="text-sm font-normal ml-1">{unitLabel}</span>
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 목표 범위 시각화 */}
      <BloodLevelTarget
        value={record.normalizedUmol}
        targetMin={record.targetMin}
        targetMax={record.targetMax}
        displayUnit={displayUnit}
      />

      {/* 당시 기준 힌트 - 현재 설정과 다를 때만 표시 */}
      {isTargetDifferent && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{t("recordedTarget")}</span>
        </div>
      )}

      {/* 메모 */}
      {record.notes && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{record.notes}</span>
        </div>
      )}
    </div>
  );
}
