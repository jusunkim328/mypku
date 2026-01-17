import { NextRequest, NextResponse } from "next/server";
import { analyzeFood } from "@/lib/gemini";
import type { AnalysisResponse } from "@/types/nutrition";

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  try {
    const { imageBase64 } = await request.json();

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

    const { items, totalNutrition } = await analyzeFood(imageBase64);

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
