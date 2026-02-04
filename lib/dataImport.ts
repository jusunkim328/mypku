/**
 * 데이터 가져오기 유틸리티
 *
 * JSON 파일에서 localStorage 또는 Supabase로 데이터 가져오기
 */

import type { ExportData } from "./dataExport";
import { createClient } from "@/lib/supabase/client";
import { NUTRITION_STORAGE_KEY } from "@/lib/constants";

// 가져오기 결과 타입
export interface ImportResult {
  success: boolean;
  error?: string;
  imported?: {
    mealCount: number;
    goalsImported: boolean;
    waterDataImported: boolean;
  };
}

// 지원 버전
const SUPPORTED_VERSIONS = ["1.0"];

/**
 * 내보내기 데이터 유효성 검사
 */
export function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  // 필수 필드 확인
  if (d.appName !== "mypku") return false;
  if (typeof d.version !== "string") return false;
  if (!SUPPORTED_VERSIONS.includes(d.version)) return false;
  if (!d.data || typeof d.data !== "object") return false;

  const innerData = d.data as Record<string, unknown>;

  // 내부 데이터 구조 확인
  if (typeof innerData.quickSetupCompleted !== "boolean") return false;
  if (!innerData.dailyGoals || typeof innerData.dailyGoals !== "object") return false;
  if (!Array.isArray(innerData.mealRecords)) return false;
  if (!Array.isArray(innerData.waterIntakes)) return false;
  if (typeof innerData.waterGoal !== "number") return false;

  return true;
}

/**
 * JSON 파일 읽기
 */
export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (error) {
        reject(new Error("Invalid JSON file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * 파일 선택 대화상자 열기 (공통 유틸)
 */
function openFileDialog(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      resolve(file || null);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

/**
 * 데이터 가져오기 (JSON 파일에서)
 *
 * @param file - JSON 파일
 * @param options - 가져오기 옵션
 * @returns 가져오기 결과
 */
export async function importFromJSON(
  file: File,
  options: {
    overwrite?: boolean; // 기존 데이터 덮어쓰기 (기본: true)
    importGoals?: boolean; // 목표 가져오기 (기본: true)
    importMeals?: boolean; // 식사 기록 가져오기 (기본: true)
    importWater?: boolean; // 수분 섭취 가져오기 (기본: true)
  } = {}
): Promise<ImportResult> {
  const {
    overwrite = true,
    importGoals = true,
    importMeals = true,
    importWater = true,
  } = options;

  try {
    // 파일 읽기
    const rawData = await readJSONFile(file);

    // 유효성 검사
    if (!validateExportData(rawData)) {
      return {
        success: false,
        error: "invalidFormat",
      };
    }

    const importData = rawData as ExportData;

    // 현재 localStorage 데이터 읽기
    let currentData: Record<string, unknown> = {};
    try {
      const stored = localStorage.getItem(NUTRITION_STORAGE_KEY);
      if (stored) {
        currentData = JSON.parse(stored);
      }
    } catch {
      currentData = {};
    }

    // 기존 상태
    const currentState = (currentData.state || {}) as Record<string, unknown>;

    // 새 데이터 병합
    const newState: Record<string, unknown> = { ...currentState };

    // Quick Setup
    newState.quickSetupCompleted = importData.data.quickSetupCompleted;

    // Goals
    if (importGoals) {
      newState.dailyGoals = importData.data.dailyGoals;
    }

    // Meal Records
    if (importMeals) {
      if (overwrite) {
        newState.mealRecords = importData.data.mealRecords;
      } else {
        // 기존 데이터에 추가 (중복 ID 제외)
        const existingIds = new Set(
          ((currentState.mealRecords as unknown[]) || []).map(
            (r: unknown) => (r as Record<string, unknown>).id
          )
        );
        const newMeals = importData.data.mealRecords.filter(
          (m) => !existingIds.has(m.id)
        );
        newState.mealRecords = [
          ...(currentState.mealRecords as unknown[] || []),
          ...newMeals,
        ];
      }
    }

    // Water Intakes
    if (importWater) {
      if (overwrite) {
        newState.waterIntakes = importData.data.waterIntakes;
        newState.waterGoal = importData.data.waterGoal;
      } else {
        // 기존 데이터에 추가 (같은 날짜는 덮어쓰기)
        const waterMap = new Map(
          ((currentState.waterIntakes as { date: string; glasses: number }[]) || []).map(
            (w) => [w.date, w]
          )
        );
        for (const w of importData.data.waterIntakes) {
          waterMap.set(w.date, w);
        }
        newState.waterIntakes = Array.from(waterMap.values());
        newState.waterGoal = importData.data.waterGoal;
      }
    }

    // localStorage에 저장
    localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify({
        ...currentData,
        state: newState,
      })
    );

    return {
      success: true,
      imported: {
        mealCount: importData.data.mealRecords.length,
        goalsImported: importGoals,
        waterDataImported: importWater,
      },
    };
  } catch (error) {
    console.error("[dataImport] Import failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknownError",
    };
  }
}

/**
 * 파일 선택 대화상자 열기 및 가져오기 (localStorage)
 */
export async function openFileAndImport(
  options?: Parameters<typeof importFromJSON>[1]
): Promise<ImportResult> {
  const file = await openFileDialog();
  if (!file) {
    return { success: false, error: "noFileSelected" };
  }
  return importFromJSON(file, options);
}

/**
 * Supabase로 데이터 가져오기 (로그인 사용자용)
 *
 * @param file - JSON 파일
 * @param userId - Supabase 사용자 ID
 * @returns 가져오기 결과
 */
export async function importToSupabase(
  file: File,
  userId: string
): Promise<ImportResult> {
  try {
    // 파일 읽기
    const rawData = await readJSONFile(file);

    // 유효성 검사
    if (!validateExportData(rawData)) {
      return {
        success: false,
        error: "invalidFormat",
      };
    }

    const importData = rawData as ExportData;
    const supabase = createClient();

    let importedCount = 0;
    let skippedCount = 0;

    // 각 레코드를 Supabase에 upsert
    for (const record of importData.data.mealRecords) {
      // client_id로 기존 레코드 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("meal_records")
        .select("id")
        .eq("user_id", userId)
        .eq("client_id", record.id)
        .maybeSingle();

      if (existing) {
        // 이미 존재하면 스킵
        skippedCount++;
        console.log(`[Import] 스킵 (이미 존재): ${record.id}`);
        continue;
      }

      // meal_records 삽입
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mealRecord, error: mealError } = await (supabase as any)
        .from("meal_records")
        .insert({
          user_id: userId,
          client_id: record.id,
          timestamp: record.timestamp,
          meal_type: record.mealType,
          total_nutrition: record.totalNutrition,
          ai_confidence: null,
          is_confirmed: true,
          data_source: "manual",
        })
        .select()
        .single();

      if (mealError) {
        console.error("[Import] meal_records 삽입 실패:", mealError);
        continue;
      }

      // food_items 삽입
      if (record.items && record.items.length > 0) {
        const foodItemsToInsert = record.items.map((item) => ({
          meal_record_id: mealRecord.id,
          name: item.name,
          weight_g: item.estimatedWeight_g || 0,
          nutrition: item.nutrition,
          confidence: item.confidence || 0,
          user_verified: item.userVerified ?? true,
          data_source: item.source || "manual",
          pku_safety: item.pkuSafety || "caution",
          exchanges: item.exchanges || 0,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: foodError } = await (supabase as any)
          .from("food_items")
          .insert(foodItemsToInsert);

        if (foodError) {
          console.error("[Import] food_items 삽입 실패:", foodError);
        }
      }

      importedCount++;
    }

    console.log(`[Import] 완료: ${importedCount}개 추가, ${skippedCount}개 스킵`);

    return {
      success: true,
      imported: {
        mealCount: importedCount,
        goalsImported: false,
        waterDataImported: false,
      },
    };
  } catch (error) {
    console.error("[Import] Supabase 가져오기 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknownError",
    };
  }
}

/**
 * 파일 선택 대화상자 열기 및 Supabase로 가져오기 (로그인 사용자용)
 */
export async function openFileAndImportToSupabase(
  userId: string
): Promise<ImportResult> {
  const file = await openFileDialog();
  if (!file) {
    return { success: false, error: "noFileSelected" };
  }
  return importToSupabase(file, userId);
}
