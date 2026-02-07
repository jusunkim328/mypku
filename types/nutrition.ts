export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// PKU 안전 등급
export type PKUSafetyLevel = "safe" | "caution" | "avoid";

// 데이터 출처 (신뢰 설계)
export type DataSource = "ai" | "barcode" | "manual" | "usda" | "kfda" | "voice";

// 신뢰도 레벨
export type ConfidenceLevel = "high" | "medium" | "low";

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg: number; // PKU 전용 앱이므로 필수
}

export interface FoodItem {
  id: string;
  name: string;
  estimatedWeight_g: number;
  nutrition: NutritionData;
  confidence: number; // AI 신뢰도 0-1
  confidenceLevel?: ConfidenceLevel; // 신뢰도 레벨 (신뢰 설계)
  userVerified: boolean; // 사용자 수정 여부
  isConfirmed?: boolean; // 사용자 확정 여부 (신뢰 설계)
  source?: DataSource; // 데이터 출처
  sourceUpdatedAt?: string; // 출처 데이터 최신 날짜
  // PKU 필드 (필수)
  pkuSafety: PKUSafetyLevel;
  exchanges: number; // 1 Exchange = 50mg Phe
  alternatives?: string[]; // 저Phe 대체품 추천
}

export interface MealRecord {
  id: string;
  timestamp: string; // ISO string for JSON serialization
  mealType: MealType;
  imageBase64?: string;
  items: FoodItem[];
  totalNutrition: NutritionData;
  // 신뢰 설계 필드
  isConfirmed?: boolean; // 사용자 확정 여부
  confirmedAt?: string; // 확정 시간
  dataSource?: DataSource; // 주요 데이터 출처
  confidenceScore?: number; // 전체 신뢰도 점수 0-1
}

export interface DailyGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg: number; // PKU 전용 앱이므로 필수
}

export const DEFAULT_DAILY_GOALS: DailyGoals = {
  calories: 2000,
  protein_g: 50,
  carbs_g: 250,
  fat_g: 65,
  phenylalanine_mg: 300,
};

export interface AnalysisResponse {
  success: boolean;
  items?: FoodItem[];
  totalNutrition?: NutritionData;
  error?: string;
}

// Gemini API 응답 스키마 (PKU 전용)
export interface GeminiAnalysisResult {
  foods: {
    name: string;
    estimated_weight_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence: number;
    confidence_level: ConfidenceLevel;
    // PKU 필수 필드
    phe_mg: number;
    pku_safety: PKUSafetyLevel;
    exchanges: number;
    alternatives?: string[];
  }[];
}
