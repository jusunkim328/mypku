"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useFormulaRecords } from "@/hooks/useFormulaRecords";
import { useBloodLevels } from "@/hooks/useBloodLevels";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTargetUserId, useCanEdit } from "@/hooks/usePatientContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateCsv,
  downloadCsv,
  shareCsv,
  type ExportData,
} from "@/lib/exportUtils";
import { ChevronDown } from "lucide-react";

const PHE_PER_EXCHANGE = 50;

type ExportPeriod = 7 | 30 | 90 | 180 | 365;

const PERIOD_OPTIONS: ExportPeriod[] = [7, 30, 90, 180, 365];

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("Export");

  const { user } = useAuth();
  const { mealRecords } = useMealRecords();
  const { isFormulaActive, fetchFormulaSummary } = useFormulaRecords();
  const { records: bloodRecords } = useBloodLevels();
  const { dailyGoals } = useUserSettings();
  const targetUserId = useTargetUserId(user?.id);
  const canEdit = useCanEdit();

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const buildExportData = useCallback(async (days: ExportPeriod): Promise<ExportData> => {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Group meals by date
    const filteredMeals = mealRecords.filter(
      (r) => new Date(r.timestamp) >= startDate
    );

    const byDate: Record<
      string,
      { phe: number; confirmedPhe: number; cal: number; pro: number; carb: number; fat: number }
    > = {};

    for (const meal of filteredMeals) {
      const dateStr = new Date(meal.timestamp).toISOString().split("T")[0];
      if (!byDate[dateStr]) {
        byDate[dateStr] = { phe: 0, confirmedPhe: 0, cal: 0, pro: 0, carb: 0, fat: 0 };
      }
      const d = byDate[dateStr];
      d.phe += meal.totalNutrition.phenylalanine_mg;
      d.cal += meal.totalNutrition.calories;
      d.pro += meal.totalNutrition.protein_g;
      d.carb += meal.totalNutrition.carbs_g;
      d.fat += meal.totalNutrition.fat_g;

      for (const item of meal.items) {
        if (item.isConfirmed) {
          d.confirmedPhe += item.nutrition.phenylalanine_mg;
        }
      }
    }

    // Formula — 전체 기간 조회 (DB는 BETWEEN 범위 쿼리 1회)
    const allFormulaDays = await fetchFormulaSummary(dates);
    const formulaMap = new Map(
      allFormulaDays
        .filter((f) => f.completedSlots > 0)
        .map((f) => [f.date, f] as const)
    );

    // 식사 기록 또는 포뮬러 완료 기록이 있는 날만 포함
    const recordedDateSet = new Set<string>();
    for (const date of Object.keys(byDate)) recordedDateSet.add(date);
    for (const date of formulaMap.keys()) recordedDateSet.add(date);
    const recordedDates = dates.filter((date) => recordedDateSet.has(date));

    const dailySummaries = recordedDates.map((date) => {
      const d = byDate[date];
      return {
        date,
        nutrition: {
          phenylalanine_mg: d?.phe ?? 0,
          calories: d?.cal ?? 0,
          protein_g: d?.pro ?? 0,
          carbs_g: d?.carb ?? 0,
          fat_g: d?.fat ?? 0,
        },
        confirmedPhe: d?.confirmedPhe ?? 0,
      };
    });

    const defaultFormula = { completedSlots: 0, totalSlots: allFormulaDays[0]?.totalSlots ?? 0 };
    const formulaDays = recordedDates.map((date) =>
      formulaMap.get(date) ?? { date, ...defaultFormula }
    );

    // Blood records within period
    const filteredBlood = bloodRecords.filter(
      (r) => new Date(r.collectedAt) >= startDate
    );

    return {
      periodDays: days,
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
      dailySummaries,
      formulaDays,
      bloodRecords: filteredBlood,
      dailyGoals,
      phePerExchange: PHE_PER_EXCHANGE,
    };
  }, [mealRecords, isFormulaActive, fetchFormulaSummary, bloodRecords, dailyGoals]);

  const handleExport = useCallback(async (days: ExportPeriod) => {
    if (isExporting) return;
    setShowMenu(false);
    setIsExporting(true);

    try {
      const data = await buildExportData(days);
      const csv = generateCsv(data);

      const shared = await shareCsv(csv);
      if (!shared) {
        downloadCsv(csv);
      }
    } catch (error) {
      console.error("[ExportButton] Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, buildExportData]);

  // Hide if viewing someone else's data without edit permission
  if (targetUserId && targetUserId !== user?.id && !canEdit) {
    return null;
  }

  const periodLabel = (days: ExportPeriod): string => {
    switch (days) {
      case 7: return t("period7d");
      case 30: return t("period1m");
      case 90: return t("period3m");
      case 180: return t("period6m");
      case 365: return t("period1y");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t("exporting")}
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {t("exportButton")}
            <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("selectPeriod")}
          </p>
          {PERIOD_OPTIONS.map((days) => (
            <button
              key={days}
              onClick={() => handleExport(days)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {periodLabel(days)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
