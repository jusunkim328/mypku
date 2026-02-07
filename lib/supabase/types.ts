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
      blood_levels: {
        Row: {
          collected_at: string
          created_at: string | null
          created_by: string | null
          id: string
          normalized_umol: number
          notes: string | null
          raw_unit: string
          raw_value: number
          target_max: number | null
          target_min: number | null
          user_id: string | null
        }
        Insert: {
          collected_at: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          normalized_umol: number
          notes?: string | null
          raw_unit?: string
          raw_value: number
          target_max?: number | null
          target_min?: number | null
          user_id?: string | null
        }
        Update: {
          collected_at?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          normalized_umol?: number
          notes?: string | null
          raw_unit?: string
          raw_value?: number
          target_max?: number | null
          target_min?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      caregiver_links: {
        Row: {
          accepted_at: string | null
          caregiver_user_id: string | null
          id: string
          invite_email: string | null
          invite_token: string | null
          invited_at: string | null
          patient_profile_id: string
          permissions: string[] | null
          relationship: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          caregiver_user_id?: string | null
          id?: string
          invite_email?: string | null
          invite_token?: string | null
          invited_at?: string | null
          patient_profile_id: string
          permissions?: string[] | null
          relationship?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          caregiver_user_id?: string | null
          id?: string
          invite_email?: string | null
          invite_token?: string | null
          invited_at?: string | null
          patient_profile_id?: string
          permissions?: string[] | null
          relationship?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_links_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          data_source: string | null
          exchanges: number | null
          id: string
          meal_record_id: string | null
          name: string
          nutrition: Json
          pku_safety: string | null
          user_verified: boolean | null
          weight_g: number | null
        }
        Insert: {
          confidence?: number | null
          data_source?: string | null
          exchanges?: number | null
          id?: string
          meal_record_id?: string | null
          name: string
          nutrition: Json
          pku_safety?: string | null
          user_verified?: boolean | null
          weight_g?: number | null
        }
        Update: {
          confidence?: number | null
          data_source?: string | null
          exchanges?: number | null
          id?: string
          meal_record_id?: string | null
          name?: string
          nutrition?: Json
          pku_safety?: string | null
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
      formula_intakes: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          time_slot: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          time_slot: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          time_slot?: string
          user_id?: string | null
        }
        Relationships: []
      }
      formula_settings: {
        Row: {
          created_at: string | null
          formula_name: string
          id: string
          is_active: boolean | null
          serving_amount: number
          serving_unit: string
          time_slots: string[]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          formula_name?: string
          id?: string
          is_active?: boolean | null
          serving_amount?: number
          serving_unit?: string
          time_slots?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          formula_name?: string
          id?: string
          is_active?: boolean | null
          serving_amount?: number
          serving_unit?: string
          time_slots?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          client_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          data_source: string | null
          id: string
          image_url: string | null
          is_confirmed: boolean | null
          meal_type: string | null
          timestamp: string
          total_nutrition: Json
          user_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          client_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          id?: string
          image_url?: string | null
          is_confirmed?: boolean | null
          meal_type?: string | null
          timestamp: string
          total_nutrition: Json
          user_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          client_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          id?: string
          image_url?: string | null
          is_confirmed?: boolean | null
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
          blood_target_max: number | null
          blood_target_min: number | null
          blood_unit: string | null
          created_at: string | null
          diagnosis_age_group: string | null
          email: string
          id: string
          mode: string | null
          name: string | null
          onboarding_completed: boolean | null
          quicksetup_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          blood_target_max?: number | null
          blood_target_min?: number | null
          blood_unit?: string | null
          created_at?: string | null
          diagnosis_age_group?: string | null
          email: string
          id: string
          mode?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          quicksetup_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          blood_target_max?: number | null
          blood_target_min?: number | null
          blood_unit?: string | null
          created_at?: string | null
          diagnosis_age_group?: string | null
          email?: string
          id?: string
          mode?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          quicksetup_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      water_intakes: {
        Row: {
          created_at: string | null
          date: string
          glasses: number
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          glasses?: number
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          glasses?: number
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite_by_token: {
        Args: { invite_token_param: string }
        Returns: Json
      }
      get_linked_patient_profiles: {
        Args: { caregiver_uid: string }
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      lookup_invite_by_token: {
        Args: { invite_token_param: string }
        Returns: Json
      }
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
export type CaregiverLinkRow = Database["public"]["Tables"]["caregiver_links"]["Row"];
export type BloodLevelRow = Database["public"]["Tables"]["blood_levels"]["Row"];
export type FormulaIntakeRow = Database["public"]["Tables"]["formula_intakes"]["Row"];
export type FormulaSettingRow = Database["public"]["Tables"]["formula_settings"]["Row"];
export type WaterIntakeRow = Database["public"]["Tables"]["water_intakes"]["Row"];
