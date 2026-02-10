/**
 * 한국 식약처 전체 데이터 동기화 스크립트
 * 약 25만 개 데이터를 페이지네이션으로 가져옴
 *
 * ⚠️ API 제한: 1,000 요청/일
 * 100개씩 가져오면 하루에 약 10만 개 가능
 *
 * 실행:
 *   bun run scripts/sync-korea-full.ts                    # 기본 (10,000개)
 *   bun run scripts/sync-korea-full.ts --pages=500        # 50,000개
 *   bun run scripts/sync-korea-full.ts --start=100        # 100페이지부터 시작
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KOREA_API_BASE = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";
const KOREA_API_KEY = process.env.FOOD_SAFETY_KOREA_API_KEY!;

const BACKOFF_CONFIG = {
  initialDelay: 300,
  maxDelay: 30000,
  maxRetries: 5,
  multiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithBackoff<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let delay = BACKOFF_CONFIG.initialDelay;

  for (let attempt = 1; attempt <= BACKOFF_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === BACKOFF_CONFIG.maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isLastAttempt) {
        console.error(`  ❌ [${context}] 최대 재시도 횟수 초과: ${errorMessage}`);
        throw error;
      }

      const isRateLimited =
        errorMessage.includes("429") ||
        errorMessage.includes("LIMITED") ||
        errorMessage.includes("OVER");

      delay = isRateLimited
        ? Math.min(delay * BACKOFF_CONFIG.multiplier * 2, BACKOFF_CONFIG.maxDelay)
        : Math.min(delay * BACKOFF_CONFIG.multiplier, BACKOFF_CONFIG.maxDelay);

      console.warn(`  ⚠️ [${context}] 재시도 ${attempt}/${BACKOFF_CONFIG.maxRetries} (${delay}ms 후)`);
      await sleep(delay);
    }
  }

  throw new Error(`${context}: 예상치 못한 오류`);
}

interface KoreanFoodResponse {
  FOOD_NM_KR: string;
  FOOD_NM_EN?: string;
  MAKER_NM?: string;
  FOOD_CAT1_NM?: string;
  SERVING_SIZE?: string;
  AMT_NUM1?: string; // kcal
  AMT_NUM3?: string; // protein
  AMT_NUM4?: string; // fat
  AMT_NUM7?: string; // carbs
  AMT_NUM139?: string; // phenylalanine
}

// 페닐알라닌 추정 계수 (단백질 g당 mg)
const PHE_ESTIMATION_FACTOR = 50;

function mapKoreanFood(food: KoreanFoodResponse) {
  if (!food.FOOD_NM_KR) return null;

  const actualPhe = parseFloat(food.AMT_NUM139 || "0") || 0;
  const protein = parseFloat(food.AMT_NUM3 || "0") || 0;

  // 실제 페닐알라닌 값이 있으면 사용, 없으면 단백질 기반 추정
  const phenylalanine = actualPhe > 0 ? actualPhe : protein * PHE_ESTIMATION_FACTOR;
  const isEstimated = actualPhe === 0 && protein > 0;

  return {
    name: food.FOOD_NM_EN || food.FOOD_NM_KR,
    name_ko: food.FOOD_NM_KR,
    brand: food.MAKER_NM || null,
    barcode: null,
    serving_size: food.SERVING_SIZE || "100g",
    phenylalanine_mg: Math.round(phenylalanine),
    protein_g: protein,
    calories: Math.round(parseFloat(food.AMT_NUM1 || "0") || 0),
    carbs_g: parseFloat(food.AMT_NUM7 || "0") || null,
    fat_g: parseFloat(food.AMT_NUM4 || "0") || null,
    category: mapCategory(food.FOOD_CAT1_NM),
    is_low_protein: protein < 1 && phenylalanine < 50,
    is_phe_estimated: isEstimated,
    source: "korea",
  };
}

function mapCategory(category?: string): string | null {
  if (!category) return null;
  if (category.includes("과일")) return "fruit";
  if (category.includes("채소")) return "vegetable";
  if (category.includes("곡")) return "grain";
  if (category.includes("육") || category.includes("어패")) return "meat";
  if (category.includes("유제품")) return "dairy";
  if (category.includes("두")) return "legume";
  return "processed";
}

async function fetchKoreaPage(page: number, pageSize: number = 100) {
  const params = new URLSearchParams({
    serviceKey: KOREA_API_KEY,
    type: "json",
    pageNo: String(page),
    numOfRows: String(pageSize),
  });

  const response = await fetch(`${KOREA_API_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Korea API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.header?.resultCode !== "00") {
    throw new Error(`Korea API error: ${data.header?.resultMsg}`);
  }

  return data;
}

interface SyncOptions {
  pages: number;
  startPage: number;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    pages: 100, // 기본 100페이지 = 10,000개
    startPage: 1,
  };

  for (const arg of args) {
    if (arg.startsWith("--pages=")) {
      options.pages = parseInt(arg.replace("--pages=", ""), 10);
    } else if (arg.startsWith("--start=")) {
      options.startPage = parseInt(arg.replace("--start=", ""), 10);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("🇰🇷 한국 식약처 전체 동기화");
  console.log(`   시작 페이지: ${options.startPage}`);
  console.log(`   동기화 페이지 수: ${options.pages}`);
  console.log(`   예상 데이터: ~${(options.pages * 100).toLocaleString()}개\n`);

  if (!KOREA_API_KEY) {
    console.error("❌ FOOD_SAFETY_KOREA_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const startTime = Date.now();

  // 첫 페이지로 총 개수 확인
  const firstPage = await fetchWithBackoff(
    () => fetchKoreaPage(1, 1),
    "총 개수 확인"
  );

  const totalCount = firstPage.body?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 100);
  console.log(`   총 데이터: ${totalCount.toLocaleString()}개 (${totalPages.toLocaleString()} 페이지)`);
  console.log(`   이번에 가져올 범위: 페이지 ${options.startPage} ~ ${options.startPage + options.pages - 1}\n`);

  let totalSaved = 0;
  let errorCount = 0;
  const endPage = Math.min(options.startPage + options.pages - 1, totalPages);

  for (let page = options.startPage; page <= endPage; page++) {
    try {
      const data = await fetchWithBackoff(
        () => fetchKoreaPage(page, 100),
        `페이지 ${page}`
      );

      const items = data.body?.items || [];
      const foods = items
        .map(mapKoreanFood)
        .filter((f: ReturnType<typeof mapKoreanFood>): f is NonNullable<typeof f> => f !== null);

      // 배치 내 중복 제거 (같은 name+source 조합)
      const uniqueFoods = foods.filter(
        (food, index, self) =>
          index === self.findIndex((f) => f.name === food.name && f.source === food.source)
      );

      if (uniqueFoods.length > 0) {
        const { error } = await supabase
          .from("pku_foods")
          .upsert(uniqueFoods as any, { onConflict: "name,source" });

        if (error) {
          console.error(`   ❌ 페이지 ${page} 저장 에러: ${error.message}`);
          errorCount++;
        } else {
          totalSaved += uniqueFoods.length;

          // 10페이지마다 진행상황 출력
          if (page % 10 === 0 || page === endPage) {
            const progress = Math.round(((page - options.startPage + 1) / options.pages) * 100);
            console.log(`   ✓ 페이지 ${page}/${endPage} (${progress}%): 총 ${totalSaved.toLocaleString()}개 저장`);
          }
        }
      }

      // API 레이트 제한 대응 (하루 1,000 요청 제한이므로 여유있게)
      await sleep(200);
    } catch (error) {
      console.error(`   ❌ 페이지 ${page} 에러: ${error}`);
      errorCount++;

      // 연속 에러 시 더 길게 대기
      if (errorCount > 3) {
        console.log(`   ⏸️ 에러 빈발, 10초 대기...`);
        await sleep(10000);
        errorCount = 0;
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // 최종 통계
  console.log("\n" + "=".repeat(50));
  console.log("📊 한국 식약처 동기화 완료!");
  console.log(`   저장된 식품: ${totalSaved.toLocaleString()}개`);
  console.log(`   소요 시간: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);

  // DB 통계
  const { count } = await supabase
    .from("pku_foods")
    .select("*", { count: "exact", head: true });

  const { data: sourceStats } = await supabase.rpc("get_source_counts").catch(() => ({ data: null }));

  console.log(`   DB 총 식품 수: ${count?.toLocaleString()}개`);

  // 다음 실행 안내
  if (endPage < totalPages) {
    console.log(`\n💡 다음 실행: bun run scripts/sync-korea-full.ts --start=${endPage + 1} --pages=${options.pages}`);
  }
}

main().catch(console.error);
