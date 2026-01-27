import { NextRequest, NextResponse } from "next/server";
import { analyzeFood } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisResponse, FoodItem, NutritionData, UserMode } from "@/types/nutrition";

/**
 * PKU 식품 DB에서 음식 이름으로 검색 (서버 사이드)
 */
async function searchPKUFoodByName(
  name: string
): Promise<{
  phenylalanine_mg: number;
  protein_g: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
} | null> {
  try {
    const supabase = await createClient();

    // 정확한 이름 매칭 먼저 시도
    const { data: exactMatch } = await supabase
      .from("pku_foods")
      .select("phenylalanine_mg, protein_g, calories, carbs_g, fat_g")
      .or(`name.ilike.${name},name_ko.ilike.${name}`)
      .limit(1)
      .single();

    if (exactMatch) {
      return exactMatch;
    }

    // 부분 매칭 시도
    const { data: partialMatch } = await supabase
      .from("pku_foods")
      .select("phenylalanine_mg, protein_g, calories, carbs_g, fat_g")
      .or(`name.ilike.%${name}%,name_ko.ilike.%${name}%`)
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
async function enrichWithDBData(items: FoodItem[]): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const enrichedItems: FoodItem[] = await Promise.all(
    items.map(async (item) => {
      const dbMatch = await searchPKUFoodByName(item.name);

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
  const totalNutrition: NutritionData = enrichedItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein_g: acc.protein_g + item.nutrition.protein_g,
      carbs_g: acc.carbs_g + item.nutrition.carbs_g,
      fat_g: acc.fat_g + item.nutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
  );

  return { items: enrichedItems, totalNutrition };
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  try {
    const { imageBase64, mode = "pku" } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "이미지가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 1. Gemini로 음식 분석 (mode에 따라 PKU/일반 스키마 사용)
    const { items: rawItems } = await analyzeFood(imageBase64, mode as UserMode);

    // 2. PKU 모드일 때만 DB와 매칭하여 Phe 데이터 보강
    // (PKU 모드에서는 Gemini가 이미 phe_mg을 반환하지만, DB 매칭으로 정확도 향상 가능)
    const { items, totalNutrition } = mode === "pku"
      ? await enrichWithDBData(rawItems)
      : { items: rawItems, totalNutrition: calculateTotalNutrition(rawItems) };

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
        error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// 일반 모드용 총 영양소 계산
function calculateTotalNutrition(items: FoodItem[]): NutritionData {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein_g: acc.protein_g + item.nutrition.protein_g,
      carbs_g: acc.carbs_g + item.nutrition.carbs_g,
      fat_g: acc.fat_g + item.nutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
  );
}
