export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          mode: "general" | "pku";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          mode?: "general" | "pku";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          mode?: "general" | "pku";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      health_conditions: {
        Row: {
          id: string;
          user_id: string;
          condition_type: "general" | "pku" | "other_metabolic";
          phenylalanine_limit: number | null;
          consent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          condition_type: "general" | "pku" | "other_metabolic";
          phenylalanine_limit?: number | null;
          consent_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          condition_type?: "general" | "pku" | "other_metabolic";
          phenylalanine_limit?: number | null;
          consent_at?: string;
          created_at?: string;
        };
      };
      daily_goals: {
        Row: {
          id: string;
          user_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          phenylalanine_mg: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          phenylalanine_mg?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          phenylalanine_mg?: number;
          updated_at?: string;
        };
      };
      meal_records: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          image_url: string | null;
          total_nutrition: Json;
          ai_confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          image_url?: string | null;
          total_nutrition: Json;
          ai_confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          image_url?: string | null;
          total_nutrition?: Json;
          ai_confidence?: number | null;
          created_at?: string;
        };
      };
      food_items: {
        Row: {
          id: string;
          meal_record_id: string;
          name: string;
          weight_g: number | null;
          nutrition: Json;
          confidence: number | null;
          user_verified: boolean;
        };
        Insert: {
          id?: string;
          meal_record_id: string;
          name: string;
          weight_g?: number | null;
          nutrition: Json;
          confidence?: number | null;
          user_verified?: boolean;
        };
        Update: {
          id?: string;
          meal_record_id?: string;
          name?: string;
          weight_g?: number | null;
          nutrition?: Json;
          confidence?: number | null;
          user_verified?: boolean;
        };
      };
      pku_foods: {
        Row: {
          id: string;
          name: string;
          name_ko: string | null;
          brand: string | null;
          barcode: string | null;
          serving_size: string;
          phenylalanine_mg: number;
          protein_g: number;
          calories: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          category: string | null;
          is_low_protein: boolean;
          is_phe_estimated: boolean;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_ko?: string | null;
          brand?: string | null;
          barcode?: string | null;
          serving_size?: string;
          phenylalanine_mg: number;
          protein_g: number;
          calories?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          category?: string | null;
          is_low_protein?: boolean;
          is_phe_estimated?: boolean;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_ko?: string | null;
          brand?: string | null;
          barcode?: string | null;
          serving_size?: string;
          phenylalanine_mg?: number;
          protein_g?: number;
          calories?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          category?: string | null;
          is_low_protein?: boolean;
          is_phe_estimated?: boolean;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_mode: "general" | "pku";
      condition_type: "general" | "pku" | "other_metabolic";
      meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    };
  };
}

// 편의 타입
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DailyGoals = Database["public"]["Tables"]["daily_goals"]["Row"];
export type MealRecord = Database["public"]["Tables"]["meal_records"]["Row"];
export type FoodItem = Database["public"]["Tables"]["food_items"]["Row"];
export type HealthCondition = Database["public"]["Tables"]["health_conditions"]["Row"];
export type PKUFoodRow = Database["public"]["Tables"]["pku_foods"]["Row"];
export type PKUFoodInsert = Database["public"]["Tables"]["pku_foods"]["Insert"];
