import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractDiagnosisInfo,
  type DiagnosisOCRResult,
} from "@/lib/diagnosisOcr";

interface DiagnosisOCRResponse {
  success: boolean;
  data?: DiagnosisOCRResult;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<DiagnosisOCRResponse>> {
  try {
    // 인증 체크 — 로그인한 사용자만 Gemini API 호출 가능
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "API key not configured" },
        { status: 500 }
      );
    }

    // Gemini Vision OCR 실행 (이미지는 메모리에서만 사용, 저장하지 않음)
    const data = await extractDiagnosisInfo(imageBase64);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[diagnosis-ocr] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Gemini API 지역 제한 에러 처리
    if (errorMessage.includes("location is not supported")) {
      return NextResponse.json(
        { success: false, error: "Service not available in your region" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to process document image" },
      { status: 500 }
    );
  }
}
