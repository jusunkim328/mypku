/**
 * 데이터 내보내기 유틸리티
 *
 * localStorage 데이터를 JSON 형식으로 내보내기
 */

import type { MealRecord, DailyGoals } from "@/types/nutrition";

// 내보내기 데이터 버전
export const EXPORT_VERSION = "1.0";

// 내보내기 데이터 타입
export interface ExportData {
  version: string;
  exportedAt: string;
  appName: "mypku";
  data: {
    quickSetupCompleted: boolean;
    dailyGoals: DailyGoals;
    mealRecords: MealRecord[];
    waterIntakes: { date: string; glasses: number }[];
    waterGoal: number;
  };
}

// localStorage 키
const STORAGE_KEY = "mypku-nutrition-storage";

/**
 * localStorage에서 데이터 읽기
 */
export function getLocalStorageData(): ExportData["data"] | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed.state || null;
  } catch (error) {
    console.error("[dataExport] Failed to read localStorage:", error);
    return null;
  }
}

/**
 * 데이터 내보내기 (JSON 형식)
 */
export function exportToJSON(): ExportData | null {
  const data = getLocalStorageData();
  if (!data) return null;

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: "mypku",
    data: {
      quickSetupCompleted: data.quickSetupCompleted ?? false,
      dailyGoals: data.dailyGoals ?? {
        calories: 2000,
        protein_g: 50,
        carbs_g: 250,
        fat_g: 65,
        phenylalanine_mg: 300,
      },
      mealRecords: data.mealRecords ?? [],
      waterIntakes: data.waterIntakes ?? [],
      waterGoal: data.waterGoal ?? 8,
    },
  };
}

/**
 * JSON 파일로 다운로드
 */
export function downloadJSON(filename?: string): boolean {
  const exportData = exportToJSON();
  if (!exportData) {
    console.error("[dataExport] No data to export");
    return false;
  }

  try {
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split("T")[0];
    const defaultFilename = `mypku-backup-${date}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("[dataExport] Failed to download JSON:", error);
    return false;
  }
}

/**
 * 내보내기 데이터 요약 정보
 */
export function getExportSummary(): {
  mealCount: number;
  dayCount: number;
  oldestDate: string | null;
  newestDate: string | null;
} | null {
  const data = getLocalStorageData();
  if (!data || !data.mealRecords?.length) {
    return {
      mealCount: 0,
      dayCount: 0,
      oldestDate: null,
      newestDate: null,
    };
  }

  const dates = data.mealRecords.map((r) =>
    new Date(r.timestamp).toISOString().split("T")[0]
  );
  const uniqueDates = [...new Set(dates)];

  const sortedDates = dates.sort();
  return {
    mealCount: data.mealRecords.length,
    dayCount: uniqueDates.length,
    oldestDate: sortedDates[0] || null,
    newestDate: sortedDates[sortedDates.length - 1] || null,
  };
}
