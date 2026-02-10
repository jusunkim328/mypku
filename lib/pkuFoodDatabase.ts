import { createClient } from "@/lib/supabase/client";
import { searchExternalFoods } from "./foodDataApis";

export interface PKUFood {
  id: string;
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
  is_phe_estimated?: boolean; // 페닐알라닌이 단백질 기반 추정치인지 여부
  source: string;
  // 국가 정보 (ISO 3166-1 alpha-2 코드)
  barcode_country?: string;   // 바코드 등록 국가 (GS1 접두사 기준)
  contributed_from?: string;  // Open Food Facts 기여자 국가
}

export interface FoodSearchOptions {
  query: string;
  category?: string;
  lowProteinOnly?: boolean;
  limit?: number;
  locale?: string;
  includeExternalFallback?: boolean;
}

// Exponential Backoff 설정
const BACKOFF_CONFIG = {
  initialDelay: 200,
  maxDelay: 5000,
  maxRetries: 3,
  multiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential Backoff로 함수 실행
 */
async function withBackoff<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let delay = BACKOFF_CONFIG.initialDelay;

  for (let attempt = 1; attempt <= BACKOFF_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === BACKOFF_CONFIG.maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isLastAttempt) {
        console.error(`[${context}] 최대 재시도 횟수 초과: ${errorMessage}`);
        throw error;
      }

      const isRateLimited =
        errorMessage.includes("429") ||
        errorMessage.includes("rate") ||
        errorMessage.includes("quota");

      delay = isRateLimited
        ? Math.min(delay * BACKOFF_CONFIG.multiplier * 2, BACKOFF_CONFIG.maxDelay)
        : Math.min(delay * BACKOFF_CONFIG.multiplier, BACKOFF_CONFIG.maxDelay);

      console.warn(`[${context}] 재시도 ${attempt}/${BACKOFF_CONFIG.maxRetries} (${delay}ms 후)`);
      await sleep(delay);
    }
  }

  throw new Error(`${context}: 예상치 못한 오류`);
}

/**
 * PKU 식품 검색 (DB만)
 */
export async function searchPKUFoods(options: FoodSearchOptions): Promise<PKUFood[]> {
  const { query, category, lowProteinOnly, limit = 20 } = options;

  const supabase = createClient();

  let queryBuilder = supabase
    .from("pku_foods")
    .select("*")
    .or(`name.ilike.%${query}%,name_ko.ilike.%${query}%`)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (lowProteinOnly) {
    queryBuilder = queryBuilder.eq("is_low_protein", true);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("PKU food search error:", error.message, error.code, error.details);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 통합 검색: DB 먼저 검색 → 결과 부족 시 외부 API 폴백 → 캐싱
 */
export async function searchWithFallback(options: FoodSearchOptions): Promise<PKUFood[]> {
  const {
    query,
    category,
    lowProteinOnly,
    limit = 20,
    locale = "en",
    includeExternalFallback = true,
  } = options;

  // 1. DB 검색
  const dbResults = await searchPKUFoods({ query, category, lowProteinOnly, limit });

  // DB 결과가 충분하거나 외부 폴백 비활성화 시 반환
  if (dbResults.length >= limit || !includeExternalFallback) {
    return dbResults;
  }

  // 2. 외부 API 폴백 (결과가 부족할 때만)
  try {
    const externalFoods = await withBackoff(
      () => searchExternalFoods(query, locale),
      `외부 API 검색 "${query}"`
    );

    if (externalFoods.length === 0) {
      return dbResults;
    }

    // 3. 외부 결과를 DB에 캐싱 (백그라운드)
    cacheExternalFoods(externalFoods).catch((err) =>
      console.error("캐싱 실패:", err)
    );

    // 4. DB 결과와 외부 결과 병합 (중복 제거)
    const dbNames = new Set(dbResults.map((f) => f.name.toLowerCase()));
    const newFoods = externalFoods
      .filter((f) => !dbNames.has(f.name.toLowerCase()))
      .map((f, index) => ({
        ...f,
        id: `external-${Date.now()}-${index}`, // 임시 ID
      })) as PKUFood[];

    const merged = [...dbResults, ...newFoods].slice(0, limit);
    return merged;
  } catch (error) {
    console.error("외부 API 폴백 에러:", error);
    return dbResults;
  }
}

/**
 * 바코드로 조회 + 외부 API 폴백 + 캐싱
 */
export async function getOrFetchByBarcode(barcode: string): Promise<PKUFood | null> {
  // 1. DB 조회
  const dbResult = await getFoodByBarcode(barcode);
  if (dbResult) {
    return dbResult;
  }

  // 2. 외부 API 조회 (현재는 바코드 검색 API가 없으므로 null 반환)
  // TODO: OpenFoodFacts API 연동 시 구현
  console.log(`바코드 ${barcode}: DB에 없음, 외부 API 미지원`);
  return null;
}

/**
 * 외부 API 결과를 DB에 캐싱
 */
async function cacheExternalFoods(
  foods: Omit<PKUFood, "id">[]
): Promise<void> {
  if (foods.length === 0) return;

  const supabase = createClient();

  // 유효한 데이터만 필터링
  const validFoods = foods.filter(
    (f) => f.name && f.phenylalanine_mg !== undefined && f.protein_g !== undefined
  );

  if (validFoods.length === 0) return;

  const insertData = validFoods.map((food) => ({
    name: food.name,
    name_ko: food.name_ko || null,
    brand: food.brand || null,
    barcode: food.barcode || null,
    serving_size: food.serving_size || "100g",
    phenylalanine_mg: food.phenylalanine_mg,
    protein_g: food.protein_g,
    calories: food.calories ?? null,
    carbs_g: food.carbs_g ?? null,
    fat_g: food.fat_g ?? null,
    category: food.category || null,
    is_low_protein: food.is_low_protein,
    source: food.source,
  }));

  const { error } = await supabase
    .from("pku_foods")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(insertData as any, { onConflict: "name,source" });

  if (error) {
    console.error("캐싱 upsert 에러:", error.message);
  } else {
    console.log(`${validFoods.length}개 식품 캐싱 완료`);
  }
}

/**
 * 바코드로 식품 조회
 */
export async function getFoodByBarcode(barcode: string): Promise<PKUFood | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (error) {
    console.error("Barcode lookup error:", error);
    return null;
  }

  return data as PKUFood;
}

/**
 * 카테고리별 식품 조회
 */
export async function getFoodsByCategory(category: string, limit = 50): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("category", category)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Category lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 저단백 식품 전체 조회
 */
export async function getLowProteinFoods(limit = 50): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("is_low_protein", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Low protein foods lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * Phe 함량 범위로 검색
 */
export async function getFoodsByPheRange(
  minPhe: number,
  maxPhe: number,
  limit = 50
): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .gte("phenylalanine_mg", minPhe)
    .lte("phenylalanine_mg", maxPhe)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Phe range lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 식품 추가 (인증된 사용자만)
 */
export async function addPKUFood(food: Omit<PKUFood, "id">): Promise<PKUFood | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert([food] as any)
    .select()
    .single();

  if (error) {
    console.error("Add PKU food error:", error);
    return null;
  }

  return data as PKUFood;
}

/**
 * 카테고리 목록
 */
export const FOOD_CATEGORIES = [
  "fruit",
  "vegetable",
  "grain",
  "meat",
  "dairy",
  "legume",
  "processed",
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

/**
 * 카테고리 라벨 (다국어)
 */
export function getCategoryLabel(category: FoodCategory, locale: string = "en"): string {
  const labels: Record<FoodCategory, Record<string, string>> = {
    fruit: { en: "Fruits", ko: "과일", ru: "Фрукты" },
    vegetable: { en: "Vegetables", ko: "채소", ru: "Овощи" },
    grain: { en: "Grains", ko: "곡물", ru: "Злаки" },
    meat: { en: "Meat & Fish", ko: "육류 & 생선", ru: "Мясо и рыба" },
    dairy: { en: "Dairy", ko: "유제품", ru: "Молочные продукты" },
    legume: { en: "Legumes", ko: "콩류", ru: "Бобовые" },
    processed: { en: "Processed Foods", ko: "가공식품", ru: "Полуфабрикаты" },
  };

  return labels[category]?.[locale] || category;
}
