import { NextRequest, NextResponse } from "next/server";
import { analyzeFood } from "@/lib/gemini";
import { requireAuth } from "@/lib/apiAuth";
import { sanitizeFilterValue } from "@/lib/sanitize";
import { calculateTotalNutrition } from "@/lib/nutrition";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResponse, FoodItem, NutritionData } from "@/types/nutrition";

/**
 * PKU 식품 DB에서 음식 이름으로 검색 (서버 사이드)
 * 인증 시 생성된 supabase 인스턴스를 재사용
 */
async function searchPKUFoodByName(
  supabase: SupabaseClient,
  name: string
): Promise<{
  phenylalanine_mg: number;
  protein_g: number;
  calories: number | null;
  carbs_g: number | null;
  fat_g: number | null;
} | null> {
  try {
    const safeName = sanitizeFilterValue(name);

    // 정확한 이름 매칭 먼저 시도
    const { data: exactMatch } = await supabase
      .from("pku_foods")
      .select("phenylalanine_mg, protein_g, calories, carbs_g, fat_g")
      .or(`name.ilike.${safeName},name_ko.ilike.${safeName}`)
      .limit(1)
      .single();

    if (exactMatch) {
      return exactMatch;
    }

    // 부분 매칭 시도
    const { data: partialMatch } = await supabase
      .from("pku_foods")
      .select("phenylalanine_mg, protein_g, calories, carbs_g, fat_g")
      .or(`name.ilike.%${safeName}%,name_ko.ilike.%${safeName}%`)
      .order("phenylalanine_mg", { ascending: true })
      .limit(1)
      .single();

    return partialMatch || null;
  } catch {
    return null;
  }
}

/**
 * Gemini 분석 결과를 PKU DB와 매칭하여 enrichment
 */
async function enrichWithDBData(supabase: SupabaseClient, items: FoodItem[]): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const enrichedItems: FoodItem[] = await Promise.all(
    items.map(async (item) => {
      const dbMatch = await searchPKUFoodByName(supabase, item.name);

      if (dbMatch) {
        // DB 매칭 성공 - 실제 Phe 값으로 교체
        const weight = item.estimatedWeight_g;
        const phePerG = dbMatch.phenylalanine_mg / 100;
        const calculatedPhe = Math.round(phePerG * weight);

        return {
          ...item,
          nutrition: {
            ...item.nutrition,
            phenylalanine_mg: calculatedPhe,
          },
          // 신뢰도 향상 (DB 매칭으로 +0.1, 최대 1.0)
          confidence: Math.min(item.confidence + 0.1, 1.0),
        };
      }

      // DB 매칭 실패 - 기존 값 유지
      return item;
    })
  );

  // 총 영양소 재계산
  const totalNutrition = calculateTotalNutrition(enrichedItems);

  return { items: enrichedItems, totalNutrition };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalysisResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "이미지가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // Base64 페이로드 크기 제한 (10MB ≈ 13.3M chars)
    if (typeof imageBase64 !== "string" || imageBase64.length > 13_300_000) {
      return NextResponse.json(
        { success: false, error: "이미지 크기가 너무 큽니다." },
        { status: 413 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 1. Gemini로 음식 분석 (PKU 전용)
    const { items: rawItems } = await analyzeFood(imageBase64);

    // 2. PKU DB와 매칭하여 Phe 데이터 보강 (인증 시 생성된 supabase 재사용)
    const { items, totalNutrition } = await enrichWithDBData(auth.supabase, rawItems);

    return NextResponse.json({
      success: true,
      items,
      totalNutrition,
    });
  } catch (error) {
    console.error("음식 분석 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
