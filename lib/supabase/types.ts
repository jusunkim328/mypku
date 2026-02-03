export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_goals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          fat_g: number | null
          id: string
          phenylalanine_mg: number | null
          protein_g: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          id?: string
          phenylalanine_mg?: number | null
          protein_g?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          id?: string
          phenylalanine_mg?: number | null
          protein_g?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          confidence: number | null
          id: string
          meal_record_id: string | null
          name: string
          nutrition: Json
          user_verified: boolean | null
          weight_g: number | null
        }
        Insert: {
          confidence?: number | null
          id?: string
          meal_record_id?: string | null
          name: string
          nutrition: Json
          user_verified?: boolean | null
          weight_g?: number | null
        }
        Update: {
          confidence?: number | null
          id?: string
          meal_record_id?: string | null
          name?: string
          nutrition?: Json
          user_verified?: boolean | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_meal_record_id_fkey"
            columns: ["meal_record_id"]
            isOneToOne: false
            referencedRelation: "meal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      health_conditions: {
        Row: {
          condition_type: string | null
          consent_at: string
          created_at: string | null
          id: string
          phenylalanine_limit: number | null
          user_id: string | null
        }
        Insert: {
          condition_type?: string | null
          consent_at: string
          created_at?: string | null
          id?: string
          phenylalanine_limit?: number | null
          user_id?: string | null
        }
        Update: {
          condition_type?: string | null
          consent_at?: string
          created_at?: string | null
          id?: string
          phenylalanine_limit?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_conditions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_records: {
        Row: {
          ai_confidence: number | null
          created_at: string | null
          id: string
          image_url: string | null
          meal_type: string | null
          timestamp: string
          total_nutrition: Json
          user_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          timestamp: string
          total_nutrition: Json
          user_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          timestamp?: string
          total_nutrition?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pku_foods: {
        Row: {
          barcode: string | null
          barcode_country: string | null
          brand: string | null
          calories: number | null
          carbs_g: number | null
          category: string | null
          contributed_from: string | null
          created_at: string | null
          fat_g: number | null
          id: string
          is_low_protein: boolean | null
          is_phe_estimated: boolean | null
          name: string
          name_de: string | null
          name_ko: string | null
          name_ru: string | null
          phenylalanine_mg: number
          protein_g: number
          serving_size: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          barcode_country?: string | null
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          contributed_from?: string | null
          created_at?: string | null
          fat_g?: number | null
          id?: string
          is_low_protein?: boolean | null
          is_phe_estimated?: boolean | null
          name: string
          name_de?: string | null
          name_ko?: string | null
          name_ru?: string | null
          phenylalanine_mg: number
          protein_g: number
          serving_size?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          barcode_country?: string | null
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          contributed_from?: string | null
          created_at?: string | null
          fat_g?: number | null
          id?: string
          is_low_protein?: boolean | null
          is_phe_estimated?: boolean | null
          name?: string
          name_de?: string | null
          name_ko?: string | null
          name_ru?: string | null
          phenylalanine_mg?: number
          protein_g?: number
          serving_size?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          mode: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          mode?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          mode?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// 편의 타입 (기존 코드 호환성 유지)
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DailyGoals = Database["public"]["Tables"]["daily_goals"]["Row"];
export type MealRecord = Database["public"]["Tables"]["meal_records"]["Row"];
export type FoodItem = Database["public"]["Tables"]["food_items"]["Row"];
export type HealthCondition = Database["public"]["Tables"]["health_conditions"]["Row"];
export type PKUFoodRow = Database["public"]["Tables"]["pku_foods"]["Row"];
export type PKUFoodInsert = Database["public"]["Tables"]["pku_foods"]["Insert"];
