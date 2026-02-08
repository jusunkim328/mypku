import { NextRequest, NextResponse } from "next/server";
import { generateCoaching } from "@/lib/gemini";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { weeklyData, dailyGoals, locale } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "API key is not configured." },
        { status: 500 }
      );
    }

    // PKU 전용 앱: mode 파라미터 제거
    const message = await generateCoaching(
      JSON.stringify(weeklyData),
      JSON.stringify(dailyGoals),
      locale || "en"
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("코칭 메시지 생성 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "코칭 메시지 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
