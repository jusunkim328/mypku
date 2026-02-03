import { extractBarcodeFromImage } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return Response.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    const barcode = await extractBarcodeFromImage(imageBase64);

    if (barcode && barcode !== "NOT_FOUND") {
      return Response.json({ success: true, barcode });
    }

    return Response.json(
      { success: false, error: "Barcode not found in image" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[barcode-ocr] Error:", error);

    // Gemini API 지역 제한 에러 처리
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("location is not supported")) {
      return Response.json(
        { success: false, error: "Service not available in your region" },
        { status: 503 }
      );
    }

    return Response.json(
      { success: false, error: "Failed to process image" },
      { status: 500 }
    );
  }
}
