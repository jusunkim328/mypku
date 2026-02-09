import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { requireAuth } from "@/lib/apiAuth";
import { withRetry } from "@/lib/retry";
import type { FoodItem, PKUSafetyLevel } from "@/types/nutrition";

const extractionSchema = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Food item name" },
          weight_g: { type: "number", description: "Estimated weight in grams" },
          calories: { type: "number", description: "Calories" },
          protein_g: { type: "number", description: "Protein in grams" },
          carbs_g: { type: "number", description: "Carbs in grams" },
          fat_g: { type: "number", description: "Fat in grams" },
          phe_mg: { type: "number", description: "Phenylalanine in mg" },
          pku_safety: {
            type: "string",
            description: "PKU safety: safe (<=20mg), caution (<=100mg), avoid (>100mg)",
          },
          exchanges: { type: "number", description: "Exchange units (phe_mg / 50)" },
          confidence: { type: "number", description: "Confidence 0.0-1.0" },
          alternatives: {
            type: "array",
            items: { type: "string" },
            description: "Low-phe alternatives",
          },
        },
        required: ["name", "weight_g", "calories", "protein_g", "carbs_g", "fat_g", "phe_mg", "pku_safety", "exchanges", "confidence"],
      },
    },
  },
  required: ["foods"],
};

const EXTRACTION_PROMPT = `You are a PKU nutrition data extractor. Given a transcript from a live video+voice food analysis session, extract ALL food items mentioned with their nutritional data.

The transcript may contain:
- User speech transcriptions
- AI model reasoning/thinking text (verbose analysis with headers like "Identifying Food", "Analyzing PKU Implications")
- AI spoken responses about food

Extract every distinct food item discussed or analyzed. For each food, provide accurate phenylalanine (Phe) content based on the transcript values or standard PKU food databases.

PKU Safety Levels:
- safe: ≤20mg Phe
- caution: 21-100mg Phe
- avoid: >100mg Phe

Exchange: 1 Exchange = 50mg Phe

If no food items were discussed, return an empty foods array.

Transcript:
`;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ foods: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ foods: [], errorCode: "server_config_error" });
    }
    const ai = new GoogleGenAI({ apiKey });

    const MAX_TRANSCRIPT_LENGTH = 50000;
    const truncatedTranscript = transcript.length > MAX_TRANSCRIPT_LENGTH
      ? transcript.slice(-MAX_TRANSCRIPT_LENGTH)
      : transcript;

    const extractConfig = {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: extractionSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    };

    let response;
    try {
      response = await withRetry(
        () => ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [EXTRACTION_PROMPT + truncatedTranscript],
          config: extractConfig,
        }),
        { logTag: "LiveExtract:primary" }
      );
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 503 || status === 429) {
        console.warn("[Live Extract] Gemini 3 unavailable, falling back to 2.5-flash");
        response = await withRetry(
          () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [EXTRACTION_PROMPT + truncatedTranscript],
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: extractionSchema,
            },
          }),
          { logTag: "LiveExtract:fallback" }
        );
      } else {
        throw e;
      }
    }

    const text = response.text;
    if (!text) return NextResponse.json({ foods: [] });

    const parsed = JSON.parse(text);
    const foods: FoodItem[] = (parsed.foods || []).map(
      (f: Record<string, unknown>) => {
        const phe_mg = Number(f.phe_mg) || 0;
        const safety = (f.pku_safety as PKUSafetyLevel) || (phe_mg > 100 ? "avoid" : phe_mg > 20 ? "caution" : "safe");
        const confidence = Math.min(Number(f.confidence) || 0.7, 1);

        return {
          id: `live-${crypto.randomUUID()}`,
          name: String(f.name || "Unknown"),
          estimatedWeight_g: Number(f.weight_g) || 100,
          nutrition: {
            calories: Number(f.calories) || 0,
            protein_g: Number(f.protein_g) || 0,
            carbs_g: Number(f.carbs_g) || 0,
            fat_g: Number(f.fat_g) || 0,
            phenylalanine_mg: phe_mg,
          },
          confidence,
          confidenceLevel: confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low",
          userVerified: false,
          isConfirmed: false,
          source: "voice" as const,
          pkuSafety: safety,
          exchanges: Number(f.exchanges) || Math.round((phe_mg / 50) * 10) / 10,
          alternatives: Array.isArray(f.alternatives) ? (f.alternatives as string[]) : undefined,
        };
      }
    );

    return NextResponse.json({ foods });
  } catch (error: unknown) {
    console.error("[Live Extract] Error:", error);
    const status = (error as { status?: number }).status;
    if (status === 503) {
      return NextResponse.json({ foods: [], errorCode: "model_overloaded" });
    }
    if (status === 429) {
      return NextResponse.json({ foods: [], errorCode: "rate_limit" });
    }
    if (status === 400) {
      return NextResponse.json({ foods: [], errorCode: "region_unsupported" });
    }
    return NextResponse.json({ foods: [], errorCode: "extract_failed" });
  }
}
