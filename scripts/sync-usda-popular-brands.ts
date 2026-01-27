/**
 * USDA Branded 인기 브랜드만 동기화
 * 각 브랜드당 최대 500개씩 저장 (용량 절약)
 *
 * 실행:
 *   bun run scripts/sync-usda-popular-brands.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = process.env.USDA_FDC_API_KEY!;

const BACKOFF_CONFIG = {
  initialDelay: 500,
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

// 인기 브랜드 목록 (정확한 brandOwner 이름)
const POPULAR_BRANDS = [
  // ===== 음료 =====
  { name: "Coca-Cola", brandOwners: ["The Coca-Cola Company"] },
  { name: "Pepsi", brandOwners: ["Pepsico Inc.", "PepsiCo, Inc."] },
  { name: "Red Bull", brandOwners: ["Red Bull North America, Inc."] },
  { name: "Monster Energy", brandOwners: ["Monster Energy Company"] },
  { name: "Starbucks", brandOwners: ["Starbucks Coffee Company"] },
  { name: "Tropicana", brandOwners: ["Tropicana Products, Inc."] },

  // ===== 시리얼/스낵 =====
  { name: "Kellogg", brandOwners: ["Kellogg Company", "The Kellogg Company", "Kellogg Company US"] },
  { name: "General Mills", brandOwners: ["General Mills", "General Mills, Inc.", "GENERAL MILLS SALES INC."] },
  { name: "Quaker", brandOwners: ["Quaker Oats Company", "The Quaker Oats Company"] },
  { name: "Nabisco", brandOwners: ["Nabisco", "Nabisco, Inc.", "Nabisco Biscuit Company"] },
  { name: "Frito-Lay", brandOwners: ["Frito-Lay Company", "Frito-Lay, Inc."] },
  { name: "Pringles", brandOwners: ["Kellogg Company US", "Pringles"] },

  // ===== 초콜릿/과자 =====
  { name: "Hershey", brandOwners: ["The Hershey Company"] },
  { name: "Mars", brandOwners: ["Mars Chocolate North America LLC", "Mars, Inc.", "Mars Wrigley Confectionery"] },
  { name: "Mondelez", brandOwners: ["Mondelez International, Inc.", "Mondelez Global LLC"] },

  // ===== 유제품/아이스크림 =====
  { name: "Dannon", brandOwners: ["Dannon Company Inc.", "The Dannon Company, Inc."] },
  { name: "Chobani", brandOwners: ["Chobani, LLC", "Chobani"] },
  { name: "Yoplait", brandOwners: ["GENERAL MILLS SALES INC."] },
  { name: "Ben & Jerry's", brandOwners: ["Ben & Jerry's Homemade Inc."] },

  // ===== 식품/조미료 =====
  { name: "Kraft", brandOwners: ["Kraft Heinz Foods Company", "Kraft Foods"] },
  { name: "Nestle", brandOwners: ["Nestle USA Inc.", "Nestle USA, Inc.", "Société des Produits Nestlé S.A."] },
  { name: "Heinz", brandOwners: ["Kraft Heinz Foods Company", "H.J. Heinz Company"] },
  { name: "Campbell", brandOwners: ["Campbell Soup Company", "Campbell's"] },
  { name: "Conagra", brandOwners: ["Conagra Brands, Inc", "Conagra Brands, Inc."] },

  // ===== 육류/단백질 =====
  { name: "Tyson", brandOwners: ["Tyson Foods, Inc."] },
  { name: "Hormel", brandOwners: ["Hormel Foods Corporation"] },
  { name: "Oscar Mayer", brandOwners: ["Kraft Heinz Foods Company"] },
  { name: "Perdue", brandOwners: ["Perdue Farms Inc.", "Perdue Foods LLC"] },

  // ===== 과일/채소 =====
  { name: "Del Monte", brandOwners: ["Del Monte Foods Inc."] },
  { name: "Dole", brandOwners: ["Dole Packaged Foods, LLC"] },
  { name: "Green Giant", brandOwners: ["B&G Foods, Inc."] },

  // ===== 베이커리/빵 =====
  { name: "Sara Lee", brandOwners: ["Bimbo Bakeries USA, Inc."] },
  { name: "Nature's Own", brandOwners: ["Flowers Foods, Inc."] },
  { name: "Thomas'", brandOwners: ["Bimbo Bakeries USA, Inc."] },
  // 패스트푸드 (제한적)
  { name: "Subway", brandOwners: ["Subway"] },
];

const MAX_PER_BRAND = 500;
const PHE_ESTIMATION_FACTOR = 50; // 단백질 g당 페닐알라닌 mg

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  gtinUpc?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

function mapUSDABrandedFood(food: USDAFood, brandName: string) {
  const nutrients = food.foodNutrients || [];

  const findNutrient = (ids: number[]) => {
    for (const id of ids) {
      const n = nutrients.find((n) => n.nutrientId === id);
      if (n) return n.value;
    }
    return 0;
  };

  const protein = findNutrient([1003]); // Protein
  const calories = findNutrient([1008, 2047, 2048]); // Energy
  const carbs = findNutrient([1005]); // Carbohydrate
  const fat = findNutrient([1004]); // Total lipid (fat)
  const phe = findNutrient([1217]); // Phenylalanine

  // 페닐알라닌: 실제 값 있으면 사용, 없으면 단백질 기반 추정
  const phenylalanine = phe > 0 ? phe : protein * PHE_ESTIMATION_FACTOR;
  const isEstimated = phe === 0 && protein > 0;

  const servingSize = food.servingSize
    ? `${food.servingSize}${food.servingSizeUnit || "g"}`
    : "100g";

  return {
    name: food.description,
    name_ko: null,
    brand: food.brandOwner || food.brandName || brandName,
    barcode: food.gtinUpc || null,
    serving_size: servingSize,
    phenylalanine_mg: Math.round(phenylalanine),
    protein_g: protein,
    calories: Math.round(calories),
    carbs_g: carbs || null,
    fat_g: fat || null,
    category: "processed",
    is_low_protein: protein < 1 && phenylalanine < 50,
    is_phe_estimated: isEstimated,
    source: "usda_branded",
  };
}

async function fetchBrandFoods(brandOwners: string[], maxItems: number): Promise<USDAFood[]> {
  const allFoods: USDAFood[] = [];
  const pageSize = 200;

  for (const brandOwner of brandOwners) {
    if (allFoods.length >= maxItems) break;

    const remaining = maxItems - allFoods.length;
    const pagesToFetch = Math.ceil(Math.min(remaining, 1000) / pageSize);

    for (let page = 1; page <= pagesToFetch && allFoods.length < maxItems; page++) {
      const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
          dataType: ["Branded"],
          pageSize,
          pageNumber: page,
          brandOwner,
        }),
      });

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const data = await response.json();
      const foods = data.foods || [];

      // brandOwner가 정확히 일치하는 것만 필터링 (부분 매칭 제외)
      const exactMatches = foods.filter((f: USDAFood) => {
        const owner = (f.brandOwner || "").toLowerCase();
        return brandOwners.some((bo) => owner === bo.toLowerCase());
      });

      allFoods.push(...exactMatches);

      if (foods.length < pageSize) break; // 더 이상 없음

      await sleep(300); // 레이트 제한
    }
  }

  return allFoods.slice(0, maxItems);
}

async function main() {
  console.log("🏷️ USDA Branded 인기 브랜드 동기화\n");
  console.log(`   브랜드 수: ${POPULAR_BRANDS.length}개`);
  console.log(`   브랜드당 최대: ${MAX_PER_BRAND}개\n`);

  if (!USDA_API_KEY) {
    console.error("❌ USDA_FDC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const startTime = Date.now();
  let totalSaved = 0;

  for (const brand of POPULAR_BRANDS) {
    console.log(`🔍 ${brand.name} 검색 중...`);

    try {
      const foods = await fetchWithBackoff(
        () => fetchBrandFoods(brand.brandOwners, MAX_PER_BRAND),
        brand.name
      );

      if (foods.length === 0) {
        console.log(`   ⚠️ 결과 없음\n`);
        continue;
      }

      const mappedFoods = foods.map((f) => mapUSDABrandedFood(f, brand.name));

      // 배치 내 중복 제거
      const uniqueFoods = mappedFoods.filter(
        (food, index, self) =>
          index === self.findIndex((f) => f.name === food.name && f.source === food.source)
      );

      // 배치 저장 (100개씩)
      for (let i = 0; i < uniqueFoods.length; i += 100) {
        const batch = uniqueFoods.slice(i, i + 100);
        const { error } = await supabase
          .from("pku_foods")
          .upsert(batch as any, { onConflict: "name,source" });

        if (error) {
          console.error(`   ❌ 저장 에러: ${error.message}`);
        }
      }

      totalSaved += uniqueFoods.length;
      console.log(`   ✓ ${uniqueFoods.length}개 저장\n`);

      await sleep(1000); // 브랜드 간 대기
    } catch (error) {
      console.error(`   ❌ ${brand.name} 에러: ${error}\n`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log("=" .repeat(50));
  console.log("📊 USDA Branded 인기 브랜드 동기화 완료!");
  console.log(`   저장된 식품: ${totalSaved.toLocaleString()}개`);
  console.log(`   소요 시간: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);

  // DB 통계
  const { data: stats } = await supabase
    .from("pku_foods")
    .select("source")
    .eq("source", "usda_branded");

  console.log(`   DB 내 Branded 총: ${stats?.length?.toLocaleString() || 0}개`);
}

main().catch(console.error);
