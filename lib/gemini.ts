import { GoogleGenAI, MediaResolution, ThinkingLevel } from "@google/genai";
import { PKU_ANALYSIS_PROMPT } from "./prompts";
import type {
  FoodItem,
  NutritionData,
  GeminiAnalysisResult,
  PKUSafetyLevel,
  ConfidenceLevel
} from "@/types/nutrition";

// 서버 사이드에서만 사용 (API Route에서 호출)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Gemini 3 모델
const GEMINI_MODEL = "gemini-3-flash-preview";

// Exponential Backoff 설정
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 1초
  maxDelayMs: 30000,  // 최대 30초
};

/**
 * Exponential Backoff로 재시도하는 유틸리티 함수
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 429 (Rate Limit) 또는 503 (Service Unavailable) 에러만 재시도
      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("Too Many Requests") ||
        lastError.message.includes("503") ||
        lastError.message.includes("Resource exhausted");

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        RETRY_CONFIG.maxDelayMs
      );

      console.log(
        `[Gemini] ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay / 1000)}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Gemini 3 Structured Output — PKU 분석 JSON Schema
const pkuAnalysisJsonSchema = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          estimated_weight_g: { type: "number" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          confidence: { type: "number" },
          confidence_level: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          // PKU 필수 필드
          phe_mg: { type: "number" },
          pku_safety: {
            type: "string",
            enum: ["safe", "caution", "avoid"],
          },
          exchanges: { type: "number" },
          alternatives: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "name",
          "estimated_weight_g",
          "calories",
          "protein_g",
          "carbs_g",
          "fat_g",
          "confidence",
          "confidence_level",
          "phe_mg",
          "pku_safety",
          "exchanges",
        ],
      },
    },
  },
  required: ["foods"],
};

/**
 * 신뢰도 레벨 결정 (신뢰 설계)
 * 불확실하면 보수적으로 처리
 */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/**
 * PKU 안전 등급 보수적 조정 (신뢰 설계)
 * 신뢰도가 낮으면 avoid로 처리
 */
function adjustPkuSafety(
  safety: PKUSafetyLevel,
  confidence: number,
  protein_g?: number
): PKUSafetyLevel {
  // 신뢰도 50% 미만이면 무조건 avoid
  if (confidence < 0.5) return "avoid";
  // 신뢰도 70% 미만이고 safe면 caution으로 격하
  if (confidence < 0.7 && safety === "safe") return "caution";
  // 고단백(>10g)인데 safe이고 신뢰도 85% 미만이면 caution으로 격하
  if (protein_g && protein_g > 10 && safety === "safe" && confidence < 0.85) return "caution";
  return safety;
}

export async function analyzeFood(imageBase64: string): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  // Base64에서 MIME 타입 추출
  const mimeMatch = imageBase64.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:.+;base64,/, "");

  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          PKU_ANALYSIS_PROMPT,
          { inlineData: { mimeType, data: base64Data } },
        ],
        config: {
          // Gemini 3: Google Search Grounding — 실시간 웹 검색으로 정확한 Phe 데이터 보강
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseJsonSchema: pkuAnalysisJsonSchema,
          // Gemini 3: Thinking Level — 복잡한 영양 분석에 deep thinking 적용
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          // Gemini 3: Media Resolution — 고해상도 이미지 분석으로 음식 정확 식별
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        },
      }),
    "analyzeFood"
  );

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed: GeminiAnalysisResult = JSON.parse(text);

  const items: FoodItem[] = parsed.foods.map((food, index) => {
    const confidenceLevel = getConfidenceLevel(food.confidence);
    const adjustedSafety = adjustPkuSafety(
      food.pku_safety as PKUSafetyLevel,
      food.confidence,
      food.protein_g
    );

    return {
      id: `food-${Date.now()}-${index}`,
      name: food.name,
      estimatedWeight_g: food.estimated_weight_g,
      nutrition: {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        phenylalanine_mg: food.phe_mg,
      },
      confidence: food.confidence,
      confidenceLevel,
      userVerified: false,
      isConfirmed: false, // 사용자 확정 전
      source: "ai" as const,
      pkuSafety: adjustedSafety,
      exchanges: food.exchanges,
      alternatives: food.alternatives,
    };
  });

  const totalNutrition: NutritionData = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein_g: acc.protein_g + item.nutrition.protein_g,
      carbs_g: acc.carbs_g + item.nutrition.carbs_g,
      fat_g: acc.fat_g + item.nutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
  );

  return { items, totalNutrition };
}

// 텍스트 기반 음식 분석 (음성 입력용 - PKU 전용)
export async function analyzeFoodByText(foodDescription: string, locale: string = "en"): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const prompt = `${PKU_ANALYSIS_PROMPT}

## Food Description to Analyze
"${foodDescription}"

## Additional Instructions for Text Input
1. Identify each food item mentioned in the description
2. Estimate reasonable portion sizes based on typical serving sizes
3. Consider common preparation methods (fried, steamed, raw, etc.)
4. If the description is vague, use average/typical values
5. Confidence should be lower (0.5-0.7) for vague descriptions
6. Consider cultural context for food names${locale === "ko" ? " (especially Korean foods like 김치, 된장찌개, 비빔밥)" : locale === "ru" ? " (especially Russian foods like борщ, пельмени, блины)" : ""}
7. confidence_level should be "low" for vague descriptions, "medium" for clear descriptions with estimated portions, "high" only for well-known foods with precise amounts

## Required Output
Return a JSON with foods array containing:
- name, estimated_weight_g, calories, protein_g, carbs_g, fat_g, confidence, confidence_level
- phe_mg (phenylalanine in mg)
- pku_safety ("safe" | "caution" | "avoid")
- exchanges (phe_mg / 50)
- alternatives (array of low-phe substitutes if pku_safety is "caution" or "avoid")`;

  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          // Gemini 3: Google Search Grounding — 텍스트 기반 검색으로 정확한 Phe 데이터
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseJsonSchema: pkuAnalysisJsonSchema,
          // Gemini 3: Thinking Level — 영양 분석에 deep thinking
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      }),
    "analyzeFoodByText"
  );

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed: GeminiAnalysisResult = JSON.parse(text);

  const items: FoodItem[] = parsed.foods.map((food, index) => {
    const confidenceLevel = getConfidenceLevel(food.confidence);
    const adjustedSafety = adjustPkuSafety(
      food.pku_safety as PKUSafetyLevel,
      food.confidence,
      food.protein_g
    );

    return {
      id: `food-${Date.now()}-${index}`,
      name: food.name,
      estimatedWeight_g: food.estimated_weight_g,
      nutrition: {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        phenylalanine_mg: food.phe_mg,
      },
      confidence: food.confidence,
      confidenceLevel,
      userVerified: false,
      isConfirmed: false,
      source: "voice" as const,
      pkuSafety: adjustedSafety,
      exchanges: food.exchanges,
      alternatives: food.alternatives,
    };
  });

  const totalNutrition: NutritionData = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein_g: acc.protein_g + item.nutrition.protein_g,
      carbs_g: acc.carbs_g + item.nutrition.carbs_g,
      fat_g: acc.fat_g + item.nutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
  );

  return { items, totalNutrition };
}

// 바코드 OCR 프롬프트
const BARCODE_OCR_PROMPT = `You are a barcode number extractor.

Look at this image and find the barcode numbers printed below the barcode bars.

Rules:
1. Return ONLY the numeric digits (no spaces, hyphens, or other characters)
2. Common formats: EAN-13 (13 digits), EAN-8 (8 digits), UPC-A (12 digits)
3. If multiple barcodes exist, return the most prominent one
4. If no barcode numbers are visible, return "NOT_FOUND"

Return format: Just the numbers, nothing else.`;

/**
 * 이미지에서 바코드 숫자를 OCR로 추출
 * 곡면 용기나 손상된 바코드에서 숫자만 읽을 때 사용
 */
export async function extractBarcodeFromImage(
  imageBase64: string
): Promise<string | null> {
  // Base64에서 MIME 타입 추출
  const mimeMatch = imageBase64.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:.+;base64,/, "");

  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          BARCODE_OCR_PROMPT,
          { inlineData: { mimeType, data: base64Data } },
        ],
        config: {
          // Gemini 3: Thinking Level — 단순 OCR에는 low thinking으로 빠른 응답
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          // Gemini 3: Media Resolution — 바코드 인식에 중간 해상도 충분
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        },
      }),
    "extractBarcode"
  );

  const text = (response.text || "").trim();

  // 숫자만 추출 (8-14자리)
  const match = text.match(/^\d{8,14}$/);
  return match ? match[0] : null;
}

export async function generateCoaching(
  weeklyData: string,
  dailyGoals: string,
  locale: string = "en"
): Promise<string> {
  const langInstructions: Record<string, string> = {
    ko: "응답은 한국어로 작성하세요.",
    ru: "Напишите ответ на русском языке.",
  };
  const languageInstruction = langInstructions[locale] || "Write your response in English.";

  const prompt = `You are a friendly PKU nutrition coach. Analyze the user's weekly nutrition data and provide encouraging feedback.

## Weekly Data
${weeklyData}

## Daily Goals
${dailyGoals}

## Instructions (PKU Focus)
1. Pay special attention to phenylalanine intake
2. Gently warn when exceeding the Phe target
3. Celebrate days with good Phe management
4. Suggest low-protein food alternatives when appropriate
5. Acknowledge the challenge of PKU diet management

## Guidelines
- Maintain a positive and encouraging tone
- Mention specific numbers (Phe mg, exchanges)
- Keep it concise (2-3 sentences)
- Do not give medical advice
- Use "you" instead of "patient"
- Avoid expressions that imply diagnosis or prescription

${languageInstruction} Respond in plain text only (not JSON).`;

  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          // Gemini 3: Thinking Level — 간결한 코칭 메시지에 low thinking
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
    "generateCoaching"
  );

  return response.text || "";
}
