import { NextRequest, NextResponse } from "next/server";
import { generateCoaching } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { weeklyData, mode, dailyGoals } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const message = await generateCoaching(
      JSON.stringify(weeklyData),
      mode,
      JSON.stringify(dailyGoals)
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
