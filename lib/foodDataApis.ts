/**
 * 외부 식품 데이터베이스 API 클라이언트
 * - 한국 식약처 식품영양성분DB
 * - 미국 USDA FoodData Central
 */

import type { PKUFood } from "./pkuFoodDatabase";

// ============================================
// 타입 정의
// ============================================

interface KoreanFoodResponse {
  FOOD_NM_KR: string; // 식품명(한글)
  FOOD_NM_EN?: string; // 식품명(영문)
  MAKER_NM?: string; // 제조사명
  FOOD_CAT1_NM?: string; // 식품대분류
  FOOD_CAT2_NM?: string; // 식품중분류
  FOOD_CAT3_NM?: string; // 식품소분류
  SERVING_SIZE?: string; // 1회 제공량
  AMT_NUM1?: string; // 에너지(kcal)
  AMT_NUM3?: string; // 단백질(g)
  AMT_NUM4?: string; // 지방(g)
  AMT_NUM7?: string; // 탄수화물(g)
  AMT_NUM139?: string; // 페닐알라닌(mg)
  // 기타 아미노산들...
}

interface KoreanAPIResponse {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    pageNo: number;
    totalCount: number;
    numOfRows: number;
    items: KoreanFoodResponse[];
  };
}

interface USDAFoodResponse {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodCategory?: string;
  foodNutrients: {
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }[];
}

interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFoodResponse[];
}

// USDA 영양소 ID
const USDA_NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003, // g
  FAT: 1004, // g
  CARBS: 1005, // g
  PHENYLALANINE: 1217, // mg
};

// ============================================
// 한국 식약처 API
// ============================================

const KOREA_API_BASE = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

export interface KoreanFoodSearchOptions {
  foodName?: string; // 식품명 검색
  category?: string; // 카테고리 필터
  page?: number;
  limit?: number;
}

/**
 * 한국 식약처 API에서 식품 데이터 가져오기
 */
export async function fetchKoreanFoods(
  options: KoreanFoodSearchOptions = {}
): Promise<{ foods: Omit<PKUFood, "id">[]; totalCount: number }> {
  const apiKey = process.env.FOOD_SAFETY_KOREA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOD_SAFETY_KOREA_API_KEY is not set");
  }

  const { foodName, category, page = 1, limit = 100 } = options;

  const params = new URLSearchParams({
    serviceKey: apiKey,
    type: "json",
    pageNo: String(page),
    numOfRows: String(limit),
  });

  if (foodName) {
    params.append("FOOD_NM_KR", foodName);
  }
  if (category) {
    params.append("FOOD_CAT1_NM", category);
  }

  const url = `${KOREA_API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Korea API error: ${response.status}`);
    }

    const data: KoreanAPIResponse = await response.json();

    if (data.header.resultCode !== "00") {
      throw new Error(`Korea API error: ${data.header.resultMsg}`);
    }

    const foods = (data.body.items || [])
      .map(mapKoreanFoodToPKU)
      .filter((food): food is Omit<PKUFood, "id"> => food !== null);

    return {
      foods,
      totalCount: data.body.totalCount,
    };
  } catch (error) {
    console.error("Korea Food API error:", error);
    throw error;
  }
}

/**
 * 한국 식약처 API 응답을 PKUFood 형식으로 변환
 */
function mapKoreanFoodToPKU(food: KoreanFoodResponse): Omit<PKUFood, "id"> | null {
  // 필수 필드 확인
  if (!food.FOOD_NM_KR) {
    return null;
  }

  const phenylalanine = parseFloat(food.AMT_NUM139 || "0") || null;
  const protein = parseFloat(food.AMT_NUM3 || "0") || 0;

  return {
    name: food.FOOD_NM_EN || food.FOOD_NM_KR,
    name_ko: food.FOOD_NM_KR,
    brand: food.MAKER_NM || undefined,
    barcode: undefined,
    serving_size: food.SERVING_SIZE || "100g",
    phenylalanine_mg: phenylalanine ? Math.round(phenylalanine) : 0,
    protein_g: protein,
    calories: Math.round(parseFloat(food.AMT_NUM1 || "0") || 0),
    carbs_g: parseFloat(food.AMT_NUM7 || "0") || undefined,
    fat_g: parseFloat(food.AMT_NUM4 || "0") || undefined,
    category: mapKoreanCategory(food.FOOD_CAT1_NM),
    is_low_protein: protein < 1 && (phenylalanine || 0) < 50,
    source: "korea",
  };
}

/**
 * 한국 카테고리를 영문 카테고리로 매핑
 */
function mapKoreanCategory(koreanCategory?: string): string | undefined {
  if (!koreanCategory) return undefined;

  const categoryMap: Record<string, string> = {
    과일류: "fruit",
    채소류: "vegetable",
    곡류: "grain",
    "육류 및 그 제품": "meat",
    "어패류 및 그 제품": "meat",
    유제품류: "dairy",
    두류: "legume",
    가공식품: "processed",
    음료류: "processed",
    조미료류: "processed",
  };

  for (const [korean, english] of Object.entries(categoryMap)) {
    if (koreanCategory.includes(korean)) {
      return english;
    }
  }

  return "processed";
}

// ============================================
// 미국 USDA API
// ============================================

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

export interface USDAFoodSearchOptions {
  query?: string;
  dataType?: "Foundation" | "SR Legacy" | "Branded";
  page?: number;
  limit?: number;
}

/**
 * USDA FoodData Central API에서 식품 데이터 가져오기
 */
export async function fetchUSDAFoods(
  options: USDAFoodSearchOptions = {}
): Promise<{ foods: Omit<PKUFood, "id">[]; totalCount: number }> {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY is not set");
  }

  const { query = "", dataType = "Foundation", page = 1, limit = 50 } = options;

  const url = `${USDA_API_BASE}/foods/search?api_key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        dataType: [dataType],
        pageSize: limit,
        pageNumber: page,
        sortBy: "dataType.keyword",
        sortOrder: "asc",
      }),
    });

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();

    const foods = (data.foods || [])
      .map(mapUSDAFoodToPKU)
      .filter((food): food is Omit<PKUFood, "id"> => food !== null);

    return {
      foods,
      totalCount: data.totalHits,
    };
  } catch (error) {
    console.error("USDA Food API error:", error);
    throw error;
  }
}

/**
 * USDA API 응답을 PKUFood 형식으로 변환
 */
function mapUSDAFoodToPKU(food: USDAFoodResponse): Omit<PKUFood, "id"> | null {
  if (!food.description) {
    return null;
  }

  const getNutrient = (nutrientId: number): number | undefined => {
    const nutrient = food.foodNutrients.find((n) => n.nutrientId === nutrientId);
    return nutrient ? nutrient.value : undefined;
  };

  const phenylalanine = getNutrient(USDA_NUTRIENT_IDS.PHENYLALANINE);
  const protein = getNutrient(USDA_NUTRIENT_IDS.PROTEIN) || 0;

  return {
    name: food.description,
    name_ko: undefined,
    brand: food.brandOwner || undefined,
    barcode: undefined,
    serving_size: "100g",
    phenylalanine_mg: phenylalanine ? Math.round(phenylalanine) : 0,
    protein_g: protein,
    calories: Math.round(getNutrient(USDA_NUTRIENT_IDS.ENERGY) || 0),
    carbs_g: getNutrient(USDA_NUTRIENT_IDS.CARBS),
    fat_g: getNutrient(USDA_NUTRIENT_IDS.FAT),
    category: mapUSDACategory(food.foodCategory),
    is_low_protein: protein < 1 && (phenylalanine || 0) < 50,
    source: "usda",
  };
}

/**
 * USDA 카테고리를 영문 카테고리로 매핑
 */
function mapUSDACategory(category?: string): string | undefined {
  if (!category) return undefined;

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes("fruit")) return "fruit";
  if (lowerCategory.includes("vegetable")) return "vegetable";
  if (lowerCategory.includes("grain") || lowerCategory.includes("cereal")) return "grain";
  if (lowerCategory.includes("meat") || lowerCategory.includes("poultry") || lowerCategory.includes("fish")) return "meat";
  if (lowerCategory.includes("dairy") || lowerCategory.includes("milk") || lowerCategory.includes("cheese")) return "dairy";
  if (lowerCategory.includes("legume") || lowerCategory.includes("bean")) return "legume";

  return "processed";
}

// ============================================
// 통합 검색 함수
// ============================================

/**
 * 모든 소스에서 식품 검색 (한국어면 한국 API, 영어면 USDA)
 */
export async function searchExternalFoods(
  query: string,
  locale: string = "ko"
): Promise<Omit<PKUFood, "id">[]> {
  const isKorean = locale === "ko" || /[가-힣]/.test(query);

  if (isKorean) {
    const result = await fetchKoreanFoods({ foodName: query, limit: 20 });
    return result.foods;
  } else {
    const result = await fetchUSDAFoods({ query, limit: 20 });
    return result.foods;
  }
}
