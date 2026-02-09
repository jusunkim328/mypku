import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { requireAuth } from "@/lib/apiAuth";
import { GEMINI_LIVE_MODEL } from "@/lib/constants/gemini";

export async function POST() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return NextResponse.json({ token: token.name, model: GEMINI_LIVE_MODEL });
  } catch (error) {
    console.error("[Live Token] Error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
