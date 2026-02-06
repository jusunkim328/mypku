import { NextRequest, NextResponse } from "next/server";
import { analyzeFoodByText } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, locale } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.trim().length < 2) {
      return NextResponse.json({ error: "Text is too short" }, { status: 400 });
    }

    // Gemini로 텍스트 분석 (PKU 전용)
    const result = await analyzeFoodByText(text, locale);

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
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
