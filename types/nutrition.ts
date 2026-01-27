export type UserMode = "pku" | "general";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// PKU 안전 등급
export type PKUSafetyLevel = "safe" | "caution" | "avoid";

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg?: number; // PKU 모드에서만 사용
}

export type FoodSource = "ai" | "barcode" | "manual" | "voice";

export interface FoodItem {
  id: string;
  name: string;
  estimatedWeight_g: number;
  nutrition: NutritionData;
  confidence: number; // AI 신뢰도 0-1
  userVerified: boolean; // 사용자 수정 여부
  source?: FoodSource; // 데이터 소스
  // PKU 특화 필드
  pkuSafety?: PKUSafetyLevel;
  exchanges?: number; // 1 Exchange = 50mg Phe
  alternatives?: string[]; // 저Phe 대체품 추천
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

// Gemini API 응답 스키마 (일반 모드)
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

// Gemini API 응답 스키마 (PKU 모드)
export interface GeminiPKUAnalysisResult {
  foods: {
    name: string;
    estimated_weight_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence: number;
    // PKU 특화 필드
    phe_mg: number;
    pku_safety: PKUSafetyLevel;
    exchanges: number;
    alternatives?: string[];
  }[];
}
