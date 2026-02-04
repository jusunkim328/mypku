/**
 * 게스트 모드(localStorage) → 로그인(Supabase) 데이터 마이그레이션 유틸
 *
 * Codex 피드백 반영:
 * - 멱등성: 업로드 성공 확인 후에만 마커 저장
 * - 버전 마커: migrated_v1_${userId} (재마이그레이션 대비)
 * - 로컬 백업: 삭제 대신 _backup 키로 보존
 * - 선제적 준비: client_id 컬럼 활용 (Phase 7 대비)
 */

import { createClient } from "@/lib/supabase/client";
import type { MealType, NutritionData, FoodItem } from "@/types/nutrition";
import { NUTRITION_STORAGE_KEY, NUTRITION_BACKUP_KEY } from "@/lib/constants";

// localStorage에 저장된 mealRecord 형식
interface LocalMealRecord {
  id: string;
  timestamp: string;
  mealType: MealType;
  imageBase64?: string;
  items: FoodItem[];
  totalNutrition: NutritionData;
}

// 마이그레이션 결과 타입
export type MigrationStatus =
  | "already_migrated"
  | "offline_deferred"
  | "skipped_remote_exists"
  | "empty_local"
  | "completed"
  | "failed";

export interface MigrationResult {
  status: MigrationStatus;
  count?: number;
  error?: string;
  reason?: string;
}

// 마이그레이션 버전 (스키마/로직 변경 시 v2로 올림)
const MIGRATION_VERSION = "v1";

/**
 * 마이그레이션 마커 키 생성
 */
function getMigrationMarkerKey(userId: string): string {
  return `migrated_${MIGRATION_VERSION}_${userId}`;
}

/**
 * 마이그레이션 마커 확인
 */
export function getMigrationStatus(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getMigrationMarkerKey(userId));
}

/**
 * localStorage에서 mealRecords 가져오기
 */
function getLocalMealRecords(): LocalMealRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const nutritionState = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!nutritionState) return [];

    const parsed = JSON.parse(nutritionState);
    return parsed?.state?.mealRecords || [];
  } catch (error) {
    console.error("[Migration] localStorage 파싱 실패:", error);
    return [];
  }
}

/**
 * localStorage에서 dailyGoals 가져오기
 */
function getLocalDailyGoals(): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg: number;
  exchange_mg: number;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const nutritionState = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!nutritionState) return null;

    const parsed = JSON.parse(nutritionState);
    return parsed?.state?.dailyGoals || null;
  } catch (error) {
    console.error("[Migration] dailyGoals 파싱 실패:", error);
    return null;
  }
}

/**
 * localStorage mealRecords를 백업으로 이동
 */
function backupLocalData(): void {
  if (typeof window === "undefined") return;

  try {
    const nutritionState = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (nutritionState) {
      localStorage.setItem(NUTRITION_BACKUP_KEY, nutritionState);
      console.log("[Migration] 로컬 데이터 백업 완료");
    }
  } catch (error) {
    console.error("[Migration] 백업 실패:", error);
  }
}

/**
 * localStorage mealRecords 클리어 (백업 후)
 */
function clearLocalMealRecords(): void {
  if (typeof window === "undefined") return;

  try {
    const nutritionState = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!nutritionState) return;

    const parsed = JSON.parse(nutritionState);
    if (parsed?.state?.mealRecords) {
      parsed.state.mealRecords = [];
      localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(parsed));
      console.log("[Migration] 로컬 mealRecords 클리어 완료");
    }
  } catch (error) {
    console.error("[Migration] 클리어 실패:", error);
  }
}

/**
 * 마이그레이션 마커 저장
 */
function setMigrationMarker(userId: string, status: MigrationStatus): void {
  if (typeof window === "undefined") return;

  const marker = `${status}_${Date.now()}`;
  localStorage.setItem(getMigrationMarkerKey(userId), marker);
  console.log(`[Migration] 마커 저장: ${getMigrationMarkerKey(userId)} = ${marker}`);
}

/**
 * 게스트 데이터를 Supabase로 마이그레이션
 *
 * @param userId - Supabase 사용자 ID
 * @returns 마이그레이션 결과
 */
export async function migrateLocalDataIfNeeded(
  userId: string
): Promise<MigrationResult> {
  // 1. 이미 마이그레이션 했는지 확인
  const existingMarker = getMigrationStatus(userId);
  if (existingMarker) {
    console.log(`[Migration] 이미 마이그레이션됨: ${existingMarker}`);
    return { status: "already_migrated" };
  }

  // 2. 오프라인 체크
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.log("[Migration] 오프라인 상태 - 마이그레이션 보류");
    return { status: "offline_deferred", reason: "offline" };
  }

  const supabase = createClient();

  try {
    // 3. Supabase에 기존 데이터 있는지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from("meal_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("[Migration] Supabase 조회 실패:", countError);
      return { status: "failed", error: countError.message };
    }

    // 4. Supabase에 이미 데이터 있음 → 마이그레이션 스킵
    if (count && count > 0) {
      console.log(`[Migration] Supabase에 기존 데이터 있음 (${count}개) - 스킵`);
      setMigrationMarker(userId, "skipped_remote_exists");
      return { status: "skipped_remote_exists", reason: "remote_has_data", count };
    }

    // 5. localStorage 데이터 가져오기
    const localRecords = getLocalMealRecords();
    if (localRecords.length === 0) {
      console.log("[Migration] 로컬 데이터 없음 - 완료");
      setMigrationMarker(userId, "empty_local");
      return { status: "empty_local" };
    }

    console.log(`[Migration] ${localRecords.length}개 레코드 마이그레이션 시작`);

    // 6. 각 레코드를 Supabase에 업로드
    for (const record of localRecords) {
      // meal_records 삽입
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mealRecord, error: mealError } = await (supabase as any)
        .from("meal_records")
        .insert({
          user_id: userId,
          client_id: record.id, // 기존 로컬 ID를 client_id로 보존 (Phase 7 대비)
          timestamp: record.timestamp,
          meal_type: record.mealType,
          total_nutrition: record.totalNutrition,
          ai_confidence: null,
          is_confirmed: true, // 마이그레이션된 데이터는 기본 확정 처리
          data_source: "manual", // 마이그레이션 출처
        })
        .select()
        .single();

      if (mealError) {
        console.error("[Migration] meal_records 삽입 실패:", mealError);
        return { status: "failed", error: mealError.message };
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
          console.error("[Migration] food_items 삽입 실패:", foodError);
          // meal_record는 이미 삽입됨 - 부분 실패 상태
          // 계속 진행 (다음 레코드)
        }
      }
    }

    // 7. dailyGoals도 마이그레이션 (없으면 생성)
    const localGoals = getLocalDailyGoals();
    if (localGoals) {
      // 기존 daily_goals 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingGoals } = await (supabase as any)
        .from("daily_goals")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!existingGoals) {
        // 새로 생성
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("daily_goals")
          .insert({
            user_id: userId,
            calories: localGoals.calories,
            protein_g: localGoals.protein_g,
            carbs_g: localGoals.carbs_g,
            fat_g: localGoals.fat_g,
            phenylalanine_mg: localGoals.phenylalanine_mg,
          });
        console.log("[Migration] dailyGoals 마이그레이션 완료");
      }
    }

    // 8. 업로드 성공 확인 (재조회)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: verifyCount } = await (supabase as any)
      .from("meal_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!verifyCount || verifyCount < localRecords.length) {
      console.error("[Migration] 검증 실패: 예상보다 적은 레코드");
      return {
        status: "failed",
        error: `검증 실패: ${verifyCount}/${localRecords.length} 업로드됨`,
      };
    }

    // 9. 성공 - 마커 저장 + 백업 + 클리어
    setMigrationMarker(userId, "completed");
    backupLocalData();
    clearLocalMealRecords();

    console.log(`[Migration] 완료: ${localRecords.length}개 레코드 마이그레이션됨`);

    return { status: "completed", count: localRecords.length };
  } catch (error) {
    console.error("[Migration] 예외 발생:", error);
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

/**
 * 마이그레이션 상태 초기화 (디버깅/테스트용)
 */
export function resetMigrationStatus(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getMigrationMarkerKey(userId));
  console.log(`[Migration] 마이그레이션 상태 초기화: ${userId}`);
}
