/**
 * 식품 데이터 동기화 스크립트
 *
 * 한국 식약처 API에서 식품 데이터를 가져와 Supabase pku_foods 테이블에 저장
 *
 * 사용법:
 *   bun run scripts/sync-food-data.ts                    # 기본 동기화 (카테고리별 100개씩)
 *   bun run scripts/sync-food-data.ts --limit=50         # 카테고리별 50개씩
 *   bun run scripts/sync-food-data.ts --category=과일류   # 특정 카테고리만
 *   bun run scripts/sync-food-data.ts --all              # 전체 동기화 (주의: 오래 걸림)
 */

import { createClient } from "@supabase/supabase-js";
import { fetchKoreanFoods } from "../lib/foodDataApis";

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 동기화할 카테고리 목록
const CATEGORIES = [
  "과일류",
  "채소류",
  "곡류",
  "두류",
  "유제품류",
  "가공식품",
  "음료류",
  "조미료류",
];

// PKU에 중요한 식품 검색어
const PKU_IMPORTANT_FOODS = [
  "저단백",
  "무단백",
  "쌀",
  "빵",
  "파스타",
  "국수",
  "과자",
  "사탕",
  "젤리",
  "아이스크림",
];

// Exponential Backoff 설정
const BACKOFF_CONFIG = {
  initialDelay: 200,    // 초기 대기 시간 (ms)
  maxDelay: 30000,      // 최대 대기 시간 (ms)
  maxRetries: 5,        // 최대 재시도 횟수
  multiplier: 2,        // 배수
};

interface SyncOptions {
  limit: number;
  category?: string;
  all: boolean;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    limit: 100,
    all: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.replace("--limit=", ""), 10);
    } else if (arg.startsWith("--category=")) {
      options.category = arg.replace("--category=", "");
    } else if (arg === "--all") {
      options.all = true;
    }
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential Backoff로 API 호출
 */
async function fetchWithBackoff<T>(
  fetchFn: () => Promise<T>,
  context: string
): Promise<T> {
  let delay = BACKOFF_CONFIG.initialDelay;

  for (let attempt = 1; attempt <= BACKOFF_CONFIG.maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      const isLastAttempt = attempt === BACKOFF_CONFIG.maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isLastAttempt) {
        console.error(`  ❌ [${context}] 최대 재시도 횟수 초과: ${errorMessage}`);
        throw error;
      }

      // 레이트 리밋 에러인지 확인
      const isRateLimited =
        errorMessage.includes("429") ||
        errorMessage.includes("rate") ||
        errorMessage.includes("quota");

      if (isRateLimited) {
        delay = Math.min(delay * BACKOFF_CONFIG.multiplier * 2, BACKOFF_CONFIG.maxDelay);
      } else {
        delay = Math.min(delay * BACKOFF_CONFIG.multiplier, BACKOFF_CONFIG.maxDelay);
      }

      console.warn(`  ⚠️ [${context}] 재시도 ${attempt}/${BACKOFF_CONFIG.maxRetries} (${delay}ms 후): ${errorMessage}`);
      await sleep(delay);
    }
  }

  throw new Error(`${context}: 예상치 못한 오류`);
}

/**
 * 배치 단위로 Supabase에 upsert
 */
async function batchUpsert(
  foods: Array<{
    name: string;
    name_ko?: string;
    brand?: string;
    barcode?: string;
    serving_size: string;
    phenylalanine_mg: number;
    protein_g: number;
    calories?: number;
    carbs_g?: number;
    fat_g?: number;
    category?: string;
    is_low_protein: boolean;
    source: string;
  }>,
  batchSize: number = 100
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (let i = 0; i < foods.length; i += batchSize) {
    const batch = foods.slice(i, i + batchSize);

    const result = await fetchWithBackoff(
      async () => {
        const res = await supabase.from("pku_foods").upsert(batch as any, { onConflict: "name,source" });
        return res;
      },
      `batch ${Math.floor(i / batchSize) + 1}`
    );
    const { error } = result;

    if (error) {
      console.error(`  ❌ upsert 에러: ${error.message}`);
      errors += batch.length;
    } else {
      success += batch.length;
    }

    // 배치 간 짧은 대기
    if (i + batchSize < foods.length) {
      await sleep(100);
    }
  }

  return { success, errors };
}

async function syncCategory(category: string, limit: number): Promise<number> {
  console.log(`\n📂 카테고리 동기화: ${category}`);

  let page = 1;
  let totalSynced = 0;
  let hasMore = true;
  const pageSize = Math.min(limit, 100); // API 최대 100개
  const allFoods: Array<{
    name: string;
    name_ko?: string;
    brand?: string;
    barcode?: string;
    serving_size: string;
    phenylalanine_mg: number;
    protein_g: number;
    calories?: number;
    carbs_g?: number;
    fat_g?: number;
    category?: string;
    is_low_protein: boolean;
    source: string;
  }> = [];

  while (hasMore && totalSynced < limit) {
    try {
      const result = await fetchWithBackoff(
        () => fetchKoreanFoods({ category, page, limit: pageSize }),
        `${category} 페이지 ${page}`
      );

      if (result.foods.length === 0) {
        hasMore = false;
        break;
      }

      // Phe 데이터가 있는 식품만 필터링
      const foodsWithPhe = result.foods.filter((f) => f.phenylalanine_mg > 0);

      if (foodsWithPhe.length > 0) {
        const mappedFoods = foodsWithPhe.map((food) => ({
          name: food.name,
          name_ko: food.name_ko,
          brand: food.brand,
          barcode: food.barcode,
          serving_size: food.serving_size,
          phenylalanine_mg: food.phenylalanine_mg,
          protein_g: food.protein_g,
          calories: food.calories,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          category: food.category,
          is_low_protein: food.is_low_protein,
          source: food.source,
        }));

        allFoods.push(...mappedFoods);
        totalSynced += foodsWithPhe.length;
        console.log(`  ✓ 페이지 ${page}: ${foodsWithPhe.length}개 수집 (총 ${totalSynced}개)`);
      }

      // 다음 페이지 또는 종료
      if (result.foods.length < pageSize || totalSynced >= limit) {
        hasMore = false;
      } else {
        page++;
        // API 레이트 제한 대응 (Exponential Backoff 적용)
        await sleep(BACKOFF_CONFIG.initialDelay);
      }
    } catch (error) {
      console.error(`  ❌ API 에러: ${error}`);
      hasMore = false;
    }
  }

  // 배치 upsert
  if (allFoods.length > 0) {
    console.log(`  💾 ${allFoods.length}개 식품 저장 중...`);
    const { success, errors } = await batchUpsert(allFoods);
    console.log(`  📊 ${category}: ${success}개 저장 완료, ${errors}개 에러`);
    return success;
  }

  console.log(`  📊 ${category}: 데이터 없음`);
  return 0;
}

async function syncPKUImportantFoods(limit: number): Promise<number> {
  console.log("\n🎯 PKU 중요 식품 동기화");

  let totalSynced = 0;
  const allFoods: Array<{
    name: string;
    name_ko?: string;
    brand?: string;
    barcode?: string;
    serving_size: string;
    phenylalanine_mg: number;
    protein_g: number;
    calories?: number;
    carbs_g?: number;
    fat_g?: number;
    category?: string;
    is_low_protein: boolean;
    source: string;
  }> = [];

  for (const keyword of PKU_IMPORTANT_FOODS) {
    console.log(`  검색: "${keyword}"`);

    try {
      const result = await fetchWithBackoff(
        () => fetchKoreanFoods({ foodName: keyword, limit: Math.min(limit, 50) }),
        `키워드 "${keyword}"`
      );

      // Phe 데이터가 있는 식품만 필터링
      const foodsWithPhe = result.foods.filter((f) => f.phenylalanine_mg > 0);

      if (foodsWithPhe.length > 0) {
        const mappedFoods = foodsWithPhe.map((food) => ({
          name: food.name,
          name_ko: food.name_ko,
          brand: food.brand,
          barcode: food.barcode,
          serving_size: food.serving_size,
          phenylalanine_mg: food.phenylalanine_mg,
          protein_g: food.protein_g,
          calories: food.calories,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          category: food.category,
          is_low_protein: food.is_low_protein,
          source: food.source,
        }));

        allFoods.push(...mappedFoods);
        totalSynced += foodsWithPhe.length;
        console.log(`    ✓ ${foodsWithPhe.length}개 수집`);
      }

      await sleep(BACKOFF_CONFIG.initialDelay);
    } catch (error) {
      console.error(`    ❌ 에러: ${error}`);
    }
  }

  // 배치 upsert
  if (allFoods.length > 0) {
    // 중복 제거 (name + source 기준)
    const uniqueFoods = allFoods.filter(
      (food, index, self) =>
        index === self.findIndex((f) => f.name === food.name && f.source === food.source)
    );

    console.log(`  💾 ${uniqueFoods.length}개 식품 저장 중... (중복 ${allFoods.length - uniqueFoods.length}개 제거)`);
    const { success, errors } = await batchUpsert(uniqueFoods);
    console.log(`  📊 PKU 중요 식품: ${success}개 저장 완료, ${errors}개 에러`);
    return success;
  }

  return 0;
}

async function main() {
  const options = parseArgs();

  console.log("🚀 식품 데이터 동기화 시작 (한국 식약처)");
  console.log(`   옵션: limit=${options.limit}, category=${options.category || "all"}, all=${options.all}`);
  console.log(`   Backoff: initial=${BACKOFF_CONFIG.initialDelay}ms, max=${BACKOFF_CONFIG.maxDelay}ms, retries=${BACKOFF_CONFIG.maxRetries}`);

  let totalSynced = 0;

  // 특정 카테고리만 동기화
  if (options.category) {
    totalSynced = await syncCategory(options.category, options.limit);
  }
  // 전체 동기화
  else if (options.all) {
    // 모든 카테고리 동기화
    for (const category of CATEGORIES) {
      const synced = await syncCategory(category, options.limit);
      totalSynced += synced;
      await sleep(500); // 카테고리 간 대기
    }

    // PKU 중요 식품 동기화
    const pkuSynced = await syncPKUImportantFoods(options.limit);
    totalSynced += pkuSynced;
  }
  // 기본: 주요 카테고리만
  else {
    const mainCategories = ["과일류", "채소류", "곡류", "유제품류"];

    for (const category of mainCategories) {
      const synced = await syncCategory(category, options.limit);
      totalSynced += synced;
      await sleep(500);
    }

    // PKU 중요 식품도 추가
    const pkuSynced = await syncPKUImportantFoods(50);
    totalSynced += pkuSynced;
  }

  // 최종 통계
  console.log("\n" + "=".repeat(50));
  console.log("📊 동기화 완료!");
  console.log(`   총 동기화된 식품: ${totalSynced}개`);

  // DB 통계 조회
  const { count: totalCount } = await supabase
    .from("pku_foods")
    .select("*", { count: "exact", head: true });

  const { data: sourceStats } = await supabase
    .from("pku_foods")
    .select("source")
    .then((res) => {
      const counts: Record<string, number> = {};
      res.data?.forEach((row) => {
        const source = (row as { source: string }).source || "unknown";
        counts[source] = (counts[source] || 0) + 1;
      });
      return { data: counts };
    });

  console.log(`   DB 총 식품 수: ${totalCount}개`);
  console.log(`   소스별: ${JSON.stringify(sourceStats)}`);
}

// 실행
main().catch(console.error);
