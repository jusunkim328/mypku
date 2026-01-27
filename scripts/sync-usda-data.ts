/**
 * USDA FoodData Central 데이터 동기화 스크립트
 *
 * 실행:
 *   bun run scripts/sync-usda-data.ts                    # 기본 동기화 (주요 식품 카테고리)
 *   bun run scripts/sync-usda-data.ts --limit=100       # 카테고리별 100개씩
 *   bun run scripts/sync-usda-data.ts --all             # 전체 동기화
 */

import { createClient } from "@supabase/supabase-js";
import { fetchUSDAFoods } from "../lib/foodDataApis";

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 검색할 식품 카테고리/키워드
const USDA_SEARCH_TERMS = [
  // 과일
  "apple",
  "banana",
  "orange",
  "grape",
  "strawberry",
  "blueberry",
  "watermelon",
  "peach",
  "pear",
  "mango",
  // 채소
  "carrot",
  "broccoli",
  "spinach",
  "tomato",
  "potato",
  "lettuce",
  "cucumber",
  "onion",
  "pepper",
  "cabbage",
  // 곡물
  "rice",
  "bread",
  "pasta",
  "cereal",
  "oatmeal",
  "wheat",
  "corn",
  // 단백질 (PKU 주의 식품)
  "chicken",
  "beef",
  "pork",
  "fish",
  "egg",
  "milk",
  "cheese",
  "yogurt",
  // 기타
  "butter",
  "oil",
  "sugar",
  "honey",
  "juice",
];

// PKU 저단백 식품 검색어
const PKU_SEARCH_TERMS = [
  "low protein",
  "gluten free",
  "rice flour",
  "tapioca",
  "cornstarch",
];

// Exponential Backoff 설정
const BACKOFF_CONFIG = {
  initialDelay: 500,    // 초기 대기 시간 (ms) - USDA는 한국보다 느려서 길게
  maxDelay: 60000,      // 최대 대기 시간 (ms)
  maxRetries: 5,        // 최대 재시도 횟수
  multiplier: 2,        // 배수
};

interface SyncOptions {
  limit: number;
  all: boolean;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    limit: 50,
    all: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.replace("--limit=", ""), 10);
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
        errorMessage.includes("quota") ||
        errorMessage.includes("OVER_RATE_LIMIT");

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

async function syncSearchTerm(searchTerm: string, limit: number): Promise<number> {
  console.log(`  🔍 검색: "${searchTerm}"`);

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

  try {
    // Foundation Foods 우선 (품질이 더 좋음)
    const foundationResult = await fetchWithBackoff(
      () =>
        fetchUSDAFoods({
          query: searchTerm,
          dataType: "Foundation",
          limit: Math.min(limit, 25),
        }),
      `${searchTerm} (Foundation)`
    );

    await sleep(BACKOFF_CONFIG.initialDelay);

    // SR Legacy도 추가
    const legacyResult = await fetchWithBackoff(
      () =>
        fetchUSDAFoods({
          query: searchTerm,
          dataType: "SR Legacy",
          limit: Math.min(limit, 25),
        }),
      `${searchTerm} (SR Legacy)`
    );

    // 결합
    const combinedFoods = [...foundationResult.foods, ...legacyResult.foods];

    if (combinedFoods.length === 0) {
      console.log(`     - 결과 없음`);
      return 0;
    }

    // 중복 제거 (이름 기준)
    const uniqueFoods = combinedFoods.filter(
      (food, index, self) => index === self.findIndex((f) => f.name === food.name)
    );

    const mappedFoods = uniqueFoods.map((food) => ({
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
    console.log(`     ✓ ${uniqueFoods.length}개 수집 (Foundation: ${foundationResult.foods.length}, Legacy: ${legacyResult.foods.length})`);
  } catch (error) {
    console.error(`     ❌ API 에러: ${error}`);
    return 0;
  }

  return allFoods.length;
}

async function main() {
  const options = parseArgs();

  console.log("🇺🇸 USDA FoodData Central 동기화 시작");
  console.log(`   옵션: limit=${options.limit}, all=${options.all}`);
  console.log(`   Backoff: initial=${BACKOFF_CONFIG.initialDelay}ms, max=${BACKOFF_CONFIG.maxDelay}ms, retries=${BACKOFF_CONFIG.maxRetries}`);

  // 검색어 목록 결정
  const searchTerms = options.all
    ? [...USDA_SEARCH_TERMS, ...PKU_SEARCH_TERMS]
    : USDA_SEARCH_TERMS.slice(0, 20); // 기본: 주요 20개만

  console.log(`\n📋 동기화할 검색어: ${searchTerms.length}개\n`);

  // 모든 식품 수집
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

  for (const term of searchTerms) {
    try {
      // Foundation Foods
      const foundationResult = await fetchWithBackoff(
        () =>
          fetchUSDAFoods({
            query: term,
            dataType: "Foundation",
            limit: Math.min(options.limit, 25),
          }),
        `${term} (Foundation)`
      );

      await sleep(BACKOFF_CONFIG.initialDelay);

      // SR Legacy
      const legacyResult = await fetchWithBackoff(
        () =>
          fetchUSDAFoods({
            query: term,
            dataType: "SR Legacy",
            limit: Math.min(options.limit, 25),
          }),
        `${term} (SR Legacy)`
      );

      const combinedFoods = [...foundationResult.foods, ...legacyResult.foods];

      if (combinedFoods.length > 0) {
        const mappedFoods = combinedFoods.map((food) => ({
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
        console.log(`  ✓ "${term}": ${combinedFoods.length}개 수집`);
      } else {
        console.log(`  - "${term}": 결과 없음`);
      }

      // API 레이트 제한 대응
      await sleep(BACKOFF_CONFIG.initialDelay);
    } catch (error) {
      console.error(`  ❌ "${term}" 에러: ${error}`);
    }
  }

  // 중복 제거 후 배치 upsert
  if (allFoods.length > 0) {
    const uniqueFoods = allFoods.filter(
      (food, index, self) =>
        index === self.findIndex((f) => f.name === food.name && f.source === food.source)
    );

    console.log(`\n💾 ${uniqueFoods.length}개 식품 저장 중... (중복 ${allFoods.length - uniqueFoods.length}개 제거)`);
    const { success, errors } = await batchUpsert(uniqueFoods);

    // 최종 통계
    console.log("\n" + "=".repeat(50));
    console.log("📊 USDA 동기화 완료!");
    console.log(`   저장 성공: ${success}개`);
    console.log(`   저장 실패: ${errors}개`);
  }

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
