import { GoogleGenerativeAI, SchemaType, GenerativeModel } from "@google/generative-ai";
import { FOOD_ANALYSIS_PROMPT, PKU_ANALYSIS_PROMPT, calculatePhenylalanine } from "./prompts";
import type {
  FoodItem,
  NutritionData,
  GeminiAnalysisResult,
  GeminiPKUAnalysisResult,
  UserMode,
  PKUSafetyLevel
} from "@/types/nutrition";

// 서버 사이드에서만 사용 (API Route에서 호출)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

// Structured Output 스키마 (일반 모드)
const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    foods: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          estimated_weight_g: { type: SchemaType.NUMBER },
          calories: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carbs_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ["name", "estimated_weight_g", "calories", "protein_g", "carbs_g", "fat_g", "confidence"],
      },
    },
  },
  required: ["foods"],
};

// Structured Output 스키마 (PKU 모드)
const pkuAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    foods: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          estimated_weight_g: { type: SchemaType.NUMBER },
          calories: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          carbs_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          confidence: { type: SchemaType.NUMBER },
          // PKU 특화 필드
          phe_mg: { type: SchemaType.NUMBER },
          pku_safety: {
            type: SchemaType.STRING,
            enum: ["safe", "caution", "avoid"],
          },
          exchanges: { type: SchemaType.NUMBER },
          alternatives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
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
          "phe_mg",
          "pku_safety",
          "exchanges",
        ],
      },
    },
  },
  required: ["foods"],
};

export async function analyzeFood(
  imageBase64: string,
  mode: UserMode = "pku"
): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const isPKU = mode === "pku";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: isPKU ? pkuAnalysisSchema : analysisSchema,
    },
  });

  // Base64에서 MIME 타입 추출
  const mimeMatch = imageBase64.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:.+;base64,/, "");

  const prompt = isPKU ? PKU_ANALYSIS_PROMPT : FOOD_ANALYSIS_PROMPT;

  const result = await withRetry(
    () => model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]),
    "analyzeFood"
  );

  const response = result.response;
  const text = response.text();

  if (isPKU) {
    // PKU 모드: PKU 특화 필드 포함
    const parsed: GeminiPKUAnalysisResult = JSON.parse(text);

    const items: FoodItem[] = parsed.foods.map((food, index) => ({
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
      userVerified: false,
      pkuSafety: food.pku_safety as PKUSafetyLevel,
      exchanges: food.exchanges,
      alternatives: food.alternatives,
    }));

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
  } else {
    // 일반 모드: 기본 영양소만
    const parsed: GeminiAnalysisResult = JSON.parse(text);

    const items: FoodItem[] = parsed.foods.map((food, index) => ({
      id: `food-${Date.now()}-${index}`,
      name: food.name,
      estimatedWeight_g: food.estimated_weight_g,
      nutrition: {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        phenylalanine_mg: calculatePhenylalanine(food.protein_g),
      },
      confidence: food.confidence,
      userVerified: false,
    }));

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
}

// 텍스트 기반 음식 분석 (음성 입력용)
export async function analyzeFoodByText(
  foodDescription: string,
  mode: UserMode = "pku"
): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const isPKU = mode === "pku";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: isPKU ? pkuAnalysisSchema : analysisSchema,
    },
  });

  // PKU 모드용 프롬프트
  const pkuTextPrompt = `${PKU_ANALYSIS_PROMPT}

## Food Description to Analyze
"${foodDescription}"

## Additional Instructions for Text Input
1. Identify each food item mentioned in the description
2. Estimate reasonable portion sizes based on typical serving sizes
3. Consider common preparation methods (fried, steamed, raw, etc.)
4. If the description is vague, use average/typical values
5. Confidence should be lower (0.5-0.7) for vague descriptions
6. Consider cultural context for food names (especially Korean foods)

## Required Output
Return a JSON with foods array containing:
- name, estimated_weight_g, calories, protein_g, carbs_g, fat_g, confidence
- phe_mg (phenylalanine in mg)
- pku_safety ("safe" | "caution" | "avoid")
- exchanges (phe_mg / 50)
- alternatives (array of low-phe substitutes if pku_safety is "caution" or "avoid")`;

  // 일반 모드용 프롬프트
  const generalTextPrompt = `You are an expert nutritionist. Analyze the following food description and estimate its nutritional content.

## Food Description
"${foodDescription}"

## Instructions
1. Identify each food item mentioned
2. Estimate reasonable portion sizes based on typical serving sizes
3. Calculate nutritional values per item
4. Consider common preparation methods (fried, steamed, raw, etc.)
5. If the description is vague, use average/typical values

## Response Format
Return a JSON with:
- foods: array of food items with name, estimated_weight_g, calories, protein_g, carbs_g, fat_g, confidence

## Important
- Confidence should be lower (0.5-0.7) for vague descriptions
- Use realistic portion sizes
- Consider cultural context for food names`;

  const prompt = isPKU ? pkuTextPrompt : generalTextPrompt;

  const result = await withRetry(
    () => model.generateContent(prompt),
    "analyzeFoodByText"
  );
  const response = result.response;
  const text = response.text();

  if (isPKU) {
    // PKU 모드: PKU 특화 필드 포함
    const parsed: GeminiPKUAnalysisResult = JSON.parse(text);

    const items: FoodItem[] = parsed.foods.map((food, index) => ({
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
      userVerified: false,
      source: "voice" as const,
      pkuSafety: food.pku_safety as PKUSafetyLevel,
      exchanges: food.exchanges,
      alternatives: food.alternatives,
    }));

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
  } else {
    // 일반 모드
    const parsed: GeminiAnalysisResult = JSON.parse(text);

    const items: FoodItem[] = parsed.foods.map((food, index) => ({
      id: `food-${Date.now()}-${index}`,
      name: food.name,
      estimatedWeight_g: food.estimated_weight_g,
      nutrition: {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        phenylalanine_mg: calculatePhenylalanine(food.protein_g),
      },
      confidence: food.confidence,
      userVerified: false,
      source: "voice" as const,
    }));

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
}

export async function generateCoaching(
  weeklyData: string,
  mode: string,
  dailyGoals: string,
  locale: string = "en"
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const languageInstruction = locale === "ko"
    ? "응답은 한국어로 작성하세요."
    : "Write your response in English.";

  const prompt = `You are a friendly nutrition coach. Analyze the user's weekly nutrition data and provide encouraging feedback.

## Weekly Data
${weeklyData}

## User Mode
${mode}

## Daily Goals
${dailyGoals}

## Instructions
1. If mode is "pku":
   - Pay special attention to phenylalanine intake
   - Gently warn when exceeding the target
   - Include low-protein food recommendations

2. For general mode:
   - Focus on calorie balance
   - Praise nutritional balance or suggest improvements

3. Common guidelines:
   - Maintain a positive and encouraging tone
   - Mention specific numbers
   - Keep it concise (2-3 sentences)
   - Do not give medical advice

## Important
- Use "user" instead of "patient"
- Avoid expressions that imply diagnosis or prescription

${languageInstruction} Respond in plain text only (not JSON).`;

  const result = await withRetry(
    () => model.generateContent(prompt),
    "generateCoaching"
  );
  return result.response.text();
}
