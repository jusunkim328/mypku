import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchExternalFoods } from "@/lib/foodDataApis";

// 서버용 Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function withBackoff<T>(fn: () => Promise<T>, context: string): Promise<T> {
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

interface PKUFood {
  id: string;
  name: string;
  name_ko?: string | null;
  brand?: string | null;
  barcode?: string | null;
  serving_size: string;
  phenylalanine_mg: number;
  protein_g: number;
  calories?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  category?: string | null;
  is_low_protein: boolean;
  source?: string | null;
}

interface ExternalFood {
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
}

/**
 * GET /api/foods/search
 *
 * 통합 식품 검색 API
 * - DB 먼저 검색
 * - 결과 부족 시 외부 API 폴백 (한국 식약처 / USDA)
 * - 외부 결과 자동 캐싱
 *
 * Query Parameters:
 * - q: 검색어 (필수)
 * - locale: 언어 (ko/en, 기본: en)
 * - category: 카테고리 필터
 * - lowProteinOnly: 저단백 식품만 (true/false)
 * - limit: 최대 결과 수 (기본: 20)
 * - fallback: 외부 API 폴백 여부 (기본: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    const locale = searchParams.get("locale") || "en";
    const category = searchParams.get("category");
    const lowProteinOnly = searchParams.get("lowProteinOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const enableFallback = searchParams.get("fallback") !== "false";

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색어(q)가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. DB 검색
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

    const { data: dbResults, error: dbError } = await queryBuilder;

    if (dbError) {
      console.error("DB 검색 에러:", dbError);
      return NextResponse.json(
        { error: "데이터베이스 검색 오류", details: dbError.message },
        { status: 500 }
      );
    }

    const foods: PKUFood[] = (dbResults || []) as PKUFood[];

    // DB 결과가 충분하거나 폴백 비활성화 시 반환
    if (foods.length >= limit || !enableFallback) {
      return NextResponse.json({
        foods,
        total: foods.length,
        source: "database",
        cached: true,
      });
    }

    // 2. 외부 API 폴백
    let externalFoods: ExternalFood[] = [];
    let externalSource = "";

    try {
      externalFoods = await withBackoff(
        () => searchExternalFoods(query, locale),
        `외부 API 검색 "${query}"`
      );
      externalSource = locale === "ko" || /[가-힣]/.test(query) ? "korea" : "usda";
    } catch (error) {
      console.error("외부 API 폴백 에러:", error);
      // 외부 API 실패해도 DB 결과는 반환
    }

    // 3. 외부 결과를 DB에 캐싱 (백그라운드)
    if (externalFoods.length > 0) {
      const validFoods = externalFoods.filter(
        (f) => f.name && f.phenylalanine_mg !== undefined && f.protein_g !== undefined
      );

      if (validFoods.length > 0) {
        // 비동기로 캐싱 (응답 차단하지 않음)
        const insertData = validFoods.map((food) => ({
          name: food.name,
          name_ko: food.name_ko ?? null,
          brand: food.brand ?? null,
          barcode: food.barcode ?? null,
          serving_size: food.serving_size || "100g",
          phenylalanine_mg: food.phenylalanine_mg,
          protein_g: food.protein_g,
          calories: food.calories ?? null,
          carbs_g: food.carbs_g ?? null,
          fat_g: food.fat_g ?? null,
          category: food.category ?? null,
          is_low_protein: food.is_low_protein,
          source: food.source,
        }));

        supabase
          .from("pku_foods")
          .upsert(insertData as any, { onConflict: "name,source" })
          .then(({ error }) => {
            if (error) {
              console.error("캐싱 에러:", error.message);
            } else {
              console.log(`${validFoods.length}개 식품 캐싱 완료`);
            }
          });
      }
    }

    // 4. 결과 병합 (중복 제거)
    const dbNames = new Set(foods.map((f) => f.name.toLowerCase()));
    const newFoods = externalFoods
      .filter((f) => !dbNames.has(f.name.toLowerCase()))
      .map((f, index) => ({
        ...f,
        id: `external-${Date.now()}-${index}`,
      })) as PKUFood[];

    const merged = [...foods, ...newFoods].slice(0, limit);

    return NextResponse.json({
      foods: merged,
      total: merged.length,
      source: newFoods.length > 0 ? `database+${externalSource}` : "database",
      cached: newFoods.length === 0,
      dbCount: foods.length,
      externalCount: newFoods.length,
    });
  } catch (error) {
    console.error("식품 검색 API 에러:", error);
    return NextResponse.json(
      {
        error: "서버 오류",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
