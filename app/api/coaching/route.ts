import { NextRequest, NextResponse } from "next/server";
import { generateCoaching } from "@/lib/gemini";
import { requireAuth } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const rl = checkRateLimit(`coaching:${auth.user.id}`, RATE_LIMITS.COACHING);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const { weeklyData, dailyGoals, locale } = await request.json();

    // 입력 크기 검증 (Gemini API 토큰 비용 방지)
    const weeklyStr = JSON.stringify(weeklyData ?? null);
    const goalsStr = JSON.stringify(dailyGoals ?? null);
    if (weeklyStr.length > 50_000 || goalsStr.length > 5_000) {
      return NextResponse.json(
        { success: false, error: "Input data too large" },
        { status: 413 }
      );
    }

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
        error: "코칭 메시지 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
