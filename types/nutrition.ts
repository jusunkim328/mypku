export type UserMode = "pku" | "general";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg?: number; // PKU 모드에서만 사용
}

export interface FoodItem {
  id: string;
  name: string;
  estimatedWeight_g: number;
  nutrition: NutritionData;
  confidence: number; // AI 신뢰도 0-1
  userVerified: boolean; // 사용자 수정 여부
}

export interface MealRecord {
  id: string;
  timestamp: string; // ISO string for JSON serialization
  mealType: MealType;
  imageBase64?: string;
  items: FoodItem[];
  totalNutrition: NutritionData;
}

export interface DailyGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg?: number; // PKU 모드
}

export interface AnalysisResponse {
  success: boolean;
  items?: FoodItem[];
  totalNutrition?: NutritionData;
  error?: string;
}

// Gemini API 응답 스키마
export interface GeminiAnalysisResult {
  foods: {
    name: string;
    estimated_weight_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence: number;
  }[];
}
