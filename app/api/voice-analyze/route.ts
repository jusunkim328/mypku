import { NextRequest, NextResponse } from "next/server";
import { analyzeFoodByText } from "@/lib/gemini";
import type { UserMode } from "@/types/nutrition";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, mode = "pku" } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.trim().length < 2) {
      return NextResponse.json(
        { error: "Text is too short" },
        { status: 400 }
      );
    }

    // Gemini로 텍스트 분석 (mode에 따라 PKU/일반 스키마 사용)
    const result = await analyzeFoodByText(text, mode as UserMode);

    return NextResponse.json({
      success: true,
      items: result.items,
      totalNutrition: result.totalNutrition,
    });
  } catch (error) {
    console.error("Voice analyze error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed"
      },
      { status: 500 }
    );
  }
}
