/**
 * USDA FoodData Central 전체 데이터 동기화 스크립트
 * Foundation + SR Legacy 전체 약 8,000개를 페이지네이션으로 가져옴
 *
 * 실행:
 *   bun run scripts/sync-usda-full.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  PHENYLALANINE: 1217,
};

const BACKOFF_CONFIG = {
  initialDelay: 1000,
  maxDelay: 60000,
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

      const isRateLimited = errorMessage.includes("429") || errorMessage.includes("rate");
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
  foodCategory?: string;
  foodNutrients: {
    nutrientId: number;
    value: number;
  }[];
}

function mapUSDAFood(food: USDAFood) {
  const getNutrient = (id: number) => food.foodNutrients.find((n) => n.nutrientId === id)?.value;

  const phenylalanine = getNutrient(USDA_NUTRIENT_IDS.PHENYLALANINE);
  const protein = getNutrient(USDA_NUTRIENT_IDS.PROTEIN) || 0;

  return {
    name: food.description,
    name_ko: null,
    brand: food.brandOwner || null,
    barcode: null,
    serving_size: "100g",
    phenylalanine_mg: phenylalanine ? Math.round(phenylalanine) : 0,
    protein_g: protein,
    calories: Math.round(getNutrient(USDA_NUTRIENT_IDS.ENERGY) || 0),
    carbs_g: getNutrient(USDA_NUTRIENT_IDS.CARBS) ?? null,
    fat_g: getNutrient(USDA_NUTRIENT_IDS.FAT) ?? null,
    category: mapCategory(food.foodCategory),
    is_low_protein: protein < 1 && (phenylalanine || 0) < 50,
    source: "usda",
  };
}

function mapCategory(category?: string): string | null {
  if (!category) return null;
  const lower = category.toLowerCase();
  if (lower.includes("fruit")) return "fruit";
  if (lower.includes("vegetable")) return "vegetable";
  if (lower.includes("grain") || lower.includes("cereal")) return "grain";
  if (lower.includes("meat") || lower.includes("poultry") || lower.includes("fish")) return "meat";
  if (lower.includes("dairy") || lower.includes("milk") || lower.includes("cheese")) return "dairy";
  if (lower.includes("legume") || lower.includes("bean")) return "legume";
  return "processed";
}

async function fetchUSDAPage(dataType: string, page: number, pageSize: number = 200) {
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "",
      dataType: [dataType],
      pageSize,
      pageNumber: page,
    }),
  });

  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status}`);
  }

  return response.json();
}

async function syncDataType(dataType: string): Promise<number> {
  console.log(`\n📂 ${dataType} 동기화 시작...`);

  // 첫 페이지로 총 개수 확인
  const firstPage = await fetchWithBackoff(
    () => fetchUSDAPage(dataType, 1, 1),
    `${dataType} 총 개수 확인`
  );

  const totalHits = firstPage.totalHits;
  const totalPages = Math.ceil(totalHits / 200);
  console.log(`   총 ${totalHits.toLocaleString()}개, ${totalPages} 페이지`);

  let totalSaved = 0;

  for (let page = 1; page <= totalPages; page++) {
    try {
      const data = await fetchWithBackoff(
        () => fetchUSDAPage(dataType, page, 200),
        `${dataType} 페이지 ${page}`
      );

      const foods = (data.foods || []).map(mapUSDAFood);

      if (foods.length > 0) {
        const { error } = await supabase
          .from("pku_foods")
          .upsert(foods as any, { onConflict: "name,source" });

        if (error) {
          console.error(`   ❌ 페이지 ${page} 저장 에러: ${error.message}`);
        } else {
          totalSaved += foods.length;
          console.log(`   ✓ 페이지 ${page}/${totalPages}: ${foods.length}개 저장 (총 ${totalSaved}개)`);
        }
      }

      // API 레이트 제한 대응 (1000 요청/시간 = 약 3.6초당 1요청)
      await sleep(1500);
    } catch (error) {
      console.error(`   ❌ 페이지 ${page} 에러: ${error}`);
    }
  }

  return totalSaved;
}

async function main() {
  console.log("🇺🇸 USDA FoodData Central 전체 동기화");
  console.log("   Foundation + SR Legacy 데이터 가져오기\n");

  if (!USDA_API_KEY) {
    console.error("❌ USDA_FDC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const startTime = Date.now();

  // Foundation Foods 동기화
  const foundationCount = await syncDataType("Foundation");

  // SR Legacy 동기화
  const legacyCount = await syncDataType("SR Legacy");

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // 최종 통계
  console.log("\n" + "=".repeat(50));
  console.log("📊 USDA 전체 동기화 완료!");
  console.log(`   Foundation: ${foundationCount.toLocaleString()}개`);
  console.log(`   SR Legacy: ${legacyCount.toLocaleString()}개`);
  console.log(`   총: ${(foundationCount + legacyCount).toLocaleString()}개`);
  console.log(`   소요 시간: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);

  // DB 통계
  const { count } = await supabase
    .from("pku_foods")
    .select("*", { count: "exact", head: true });

  console.log(`   DB 총 식품 수: ${count?.toLocaleString()}개`);
}

main().catch(console.error);
