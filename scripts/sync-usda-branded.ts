/**
 * USDA Branded 데이터 동기화 스크립트
 * 약 45만 개 브랜드 제품 데이터를 페이지네이션으로 가져옴
 *
 * ⚠️ 페닐알라닌은 단백질 기반 추정치 (protein × 50)
 * ⚠️ is_phe_estimated = true로 표시됨
 *
 * 실행:
 *   bun run scripts/sync-usda-branded.ts                    # 기본 (1만 개)
 *   bun run scripts/sync-usda-branded.ts --pages=100        # 2만 개
 *   bun run scripts/sync-usda-branded.ts --start=50         # 50페이지부터 시작
 *   bun run scripts/sync-usda-branded.ts --all              # 전체 (~45만 개)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

// 영양소 ID
const NUTRIENT_IDS = {
  ENERGY: 1008,    // kcal
  PROTEIN: 1003,   // g
  FAT: 1004,       // g
  CARBS: 1005,     // g
  PHENYLALANINE: 1217, // mg (대부분 없음)
};

// 페닐알라닌 추정 계수 (단백질 g당 mg)
const PHE_ESTIMATION_FACTOR = 50;

const BACKOFF_CONFIG = {
  initialDelay: 1500,   // USDA API는 느리므로 여유있게
  maxDelay: 120000,
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
        errorMessage.includes("rate") ||
        errorMessage.includes("OVER_RATE_LIMIT");

      delay = isRateLimited
        ? Math.min(delay * BACKOFF_CONFIG.multiplier * 2, BACKOFF_CONFIG.maxDelay)
        : Math.min(delay * BACKOFF_CONFIG.multiplier, BACKOFF_CONFIG.maxDelay);

      console.warn(`  ⚠️ [${context}] 재시도 ${attempt}/${BACKOFF_CONFIG.maxRetries} (${delay}ms 후)`);
      await sleep(delay);
    }
  }

  throw new Error(`${context}: 예상치 못한 오류`);
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: {
    nutrientId: number;
    value: number;
  }[];
}

function mapBrandedFood(food: USDAFood) {
  const getNutrient = (id: number) => food.foodNutrients?.find((n) => n.nutrientId === id)?.value;

  const protein = getNutrient(NUTRIENT_IDS.PROTEIN) || 0;
  const actualPhe = getNutrient(NUTRIENT_IDS.PHENYLALANINE);

  // 실제 페닐알라닌 값이 있으면 사용, 없으면 단백질 기반 추정
  const phenylalanine = actualPhe !== undefined && actualPhe > 0
    ? actualPhe
    : protein * PHE_ESTIMATION_FACTOR;

  const isEstimated = actualPhe === undefined || actualPhe === 0;

  // 서빙 사이즈 처리
  const servingSize = food.servingSize && food.servingSizeUnit
    ? `${food.servingSize}${food.servingSizeUnit}`
    : "100g";

  // 브랜드명 처리
  const brand = food.brandOwner || food.brandName || null;

  return {
    name: food.description,
    name_ko: null,
    brand,
    barcode: null,
    serving_size: servingSize,
    phenylalanine_mg: Math.round(phenylalanine),
    protein_g: protein,
    calories: Math.round(getNutrient(NUTRIENT_IDS.ENERGY) || 0),
    carbs_g: getNutrient(NUTRIENT_IDS.CARBS) ?? null,
    fat_g: getNutrient(NUTRIENT_IDS.FAT) ?? null,
    category: mapCategory(food.foodCategory),
    is_low_protein: protein < 1 && phenylalanine < 50,
    is_phe_estimated: isEstimated,
    source: "usda_branded",
  };
}

function mapCategory(category?: string): string | null {
  if (!category) return null;
  const lower = category.toLowerCase();

  if (lower.includes("fruit")) return "fruit";
  if (lower.includes("vegetable") || lower.includes("veggie")) return "vegetable";
  if (lower.includes("grain") || lower.includes("bread") || lower.includes("cereal") || lower.includes("pasta")) return "grain";
  if (lower.includes("meat") || lower.includes("poultry") || lower.includes("chicken") || lower.includes("beef") || lower.includes("pork")) return "meat";
  if (lower.includes("fish") || lower.includes("seafood")) return "meat";
  if (lower.includes("dairy") || lower.includes("milk") || lower.includes("cheese") || lower.includes("yogurt")) return "dairy";
  if (lower.includes("bean") || lower.includes("legume") || lower.includes("nut")) return "legume";
  if (lower.includes("beverage") || lower.includes("drink") || lower.includes("juice") || lower.includes("soda")) return "beverage";
  if (lower.includes("snack") || lower.includes("candy") || lower.includes("chocolate") || lower.includes("cookie")) return "snack";

  return "processed";
}

async function fetchBrandedPage(page: number, pageSize: number = 200) {
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: ["Branded"],
      pageSize,
      pageNumber: page,
      sortBy: "dataType.keyword",
      sortOrder: "asc",
    }),
  });

  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

interface SyncOptions {
  pages: number;
  startPage: number;
  all: boolean;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    pages: 50,      // 기본 50페이지 = 10,000개
    startPage: 1,
    all: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--pages=")) {
      options.pages = parseInt(arg.replace("--pages=", ""), 10);
    } else if (arg.startsWith("--start=")) {
      options.startPage = parseInt(arg.replace("--start=", ""), 10);
    } else if (arg === "--all") {
      options.all = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("🏭 USDA Branded 데이터 동기화");
  console.log("   ⚠️  페닐알라닌은 단백질 기반 추정치 (protein × 50)");
  console.log("   ⚠️  is_phe_estimated = true로 표시됨\n");

  if (!USDA_API_KEY) {
    console.error("❌ USDA_FDC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const startTime = Date.now();

  // 첫 페이지로 총 개수 확인
  console.log("📊 총 데이터 수 확인 중...");
  const firstPage = await fetchWithBackoff(
    () => fetchBrandedPage(1, 1),
    "총 개수 확인"
  );

  const totalHits = firstPage.totalHits;
  const totalPages = Math.ceil(totalHits / 200);

  // --all 옵션이면 전체 페이지
  const pagesToSync = options.all ? totalPages - options.startPage + 1 : options.pages;
  const endPage = Math.min(options.startPage + pagesToSync - 1, totalPages);

  console.log(`   총 Branded 데이터: ${totalHits.toLocaleString()}개 (${totalPages.toLocaleString()} 페이지)`);
  console.log(`   동기화 범위: 페이지 ${options.startPage} ~ ${endPage} (${pagesToSync} 페이지)`);
  console.log(`   예상 데이터: ~${(pagesToSync * 200).toLocaleString()}개\n`);

  let totalSaved = 0;
  let totalEstimated = 0;
  let totalActual = 0;
  let errorCount = 0;

  for (let page = options.startPage; page <= endPage; page++) {
    try {
      const data = await fetchWithBackoff(
        () => fetchBrandedPage(page, 200),
        `페이지 ${page}`
      );

      const foods = (data.foods || []).map(mapBrandedFood);

      if (foods.length > 0) {
        // 중복 제거 (같은 이름 + 소스)
        const uniqueFoods = foods.filter(
          (food: ReturnType<typeof mapBrandedFood>, index: number, self: ReturnType<typeof mapBrandedFood>[]) =>
            index === self.findIndex((f) => f.name === food.name)
        );

        const { error } = await supabase
          .from("pku_foods")
          .upsert(uniqueFoods as any, { onConflict: "name,source" });

        if (error) {
          console.error(`   ❌ 페이지 ${page} 저장 에러: ${error.message}`);
          errorCount++;
        } else {
          totalSaved += uniqueFoods.length;
          totalEstimated += uniqueFoods.filter((f: ReturnType<typeof mapBrandedFood>) => f.is_phe_estimated).length;
          totalActual += uniqueFoods.filter((f: ReturnType<typeof mapBrandedFood>) => !f.is_phe_estimated).length;

          // 10페이지마다 진행상황 출력
          if (page % 10 === 0 || page === endPage) {
            const progress = Math.round(((page - options.startPage + 1) / pagesToSync) * 100);
            console.log(`   ✓ 페이지 ${page}/${endPage} (${progress}%): 총 ${totalSaved.toLocaleString()}개 저장`);
          }
        }
      }

      // API 레이트 제한 대응 (1000 요청/시간)
      await sleep(2000);
    } catch (error) {
      console.error(`   ❌ 페이지 ${page} 에러: ${error}`);
      errorCount++;

      if (errorCount > 5) {
        console.log(`   ⏸️ 에러 빈발, 30초 대기...`);
        await sleep(30000);
        errorCount = 0;
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // 최종 통계
  console.log("\n" + "=".repeat(50));
  console.log("📊 USDA Branded 동기화 완료!");
  console.log(`   저장된 식품: ${totalSaved.toLocaleString()}개`);
  console.log(`   - 페닐알라닌 실측치: ${totalActual.toLocaleString()}개`);
  console.log(`   - 페닐알라닌 추정치: ${totalEstimated.toLocaleString()}개`);
  console.log(`   소요 시간: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);

  // DB 통계
  const { count } = await supabase
    .from("pku_foods")
    .select("*", { count: "exact", head: true });

  console.log(`\n   DB 총 식품 수: ${count?.toLocaleString()}개`);

  // 다음 실행 안내
  if (endPage < totalPages) {
    console.log(`\n💡 다음 실행: bun run scripts/sync-usda-branded.ts --start=${endPage + 1} --pages=${options.pages}`);
  }
}

main().catch(console.error);
