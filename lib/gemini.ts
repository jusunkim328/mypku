import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { FOOD_ANALYSIS_PROMPT, calculatePhenylalanine } from "./prompts";
import type { FoodItem, NutritionData, GeminiAnalysisResult } from "@/types/nutrition";

// 서버 사이드에서만 사용 (API Route에서 호출)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Structured Output 스키마
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

export async function analyzeFood(imageBase64: string): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  // Base64에서 MIME 타입 추출
  const mimeMatch = imageBase64.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:.+;base64,/, "");

  const result = await model.generateContent([
    FOOD_ANALYSIS_PROMPT,
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
  ]);

  const response = result.response;
  const text = response.text();
  const parsed: GeminiAnalysisResult = JSON.parse(text);

  // FoodItem 형식으로 변환
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

  // 총 영양소 계산
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

// 텍스트 기반 음식 분석 (음성 입력용)
export async function analyzeFoodByText(foodDescription: string): Promise<{
  items: FoodItem[];
  totalNutrition: NutritionData;
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const prompt = `You are an expert nutritionist. Analyze the following food description and estimate its nutritional content.

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

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const parsed: GeminiAnalysisResult = JSON.parse(text);

  // FoodItem 형식으로 변환
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

  // 총 영양소 계산
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

export async function generateCoaching(
  weeklyData: string,
  mode: string,
  dailyGoals: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });

  const prompt = `당신은 친근한 영양 코치입니다. 사용자의 주간 영양 섭취 데이터를 분석하고 격려하는 피드백을 제공하세요.

## 분석 데이터
${weeklyData}

## 사용자 모드
${mode}

## 일일 목표
${dailyGoals}

## 지침
1. ${mode}가 "pku"인 경우:
   - 페닐알라닌 섭취량에 특히 주목하세요
   - 목표치 초과 시 부드럽게 주의를 주세요
   - 저단백 식품 추천을 포함하세요

2. 일반 모드인 경우:
   - 칼로리 균형에 집중하세요
   - 영양소 균형을 칭찬하거나 개선점을 제안하세요

3. 공통:
   - 긍정적이고 격려하는 톤을 유지하세요
   - 구체적인 수치를 언급하세요
   - 2-3문장으로 간결하게 작성하세요
   - 의료 조언은 하지 마세요

## 중요
- "환자"라는 표현 대신 "사용자"를 사용하세요
- 진단이나 처방을 암시하는 표현은 피하세요

응답은 한국어로 작성하고, 일반 텍스트로만 응답하세요 (JSON 아님).`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
