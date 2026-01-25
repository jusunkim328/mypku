"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionStore } from "./useNutritionStore";
import { uploadMealImage, deleteMealImage } from "@/lib/supabase/storage";
import { toast } from "./useToast";
import type { FoodItem, MealRecord, NutritionData, MealType } from "@/types/nutrition";

interface MealRecordWithItems {
  id: string;
  timestamp: string;
  mealType: MealType;
  imageUrl: string | null;
  items: FoodItem[];
  totalNutrition: NutritionData;
  aiConfidence: number | null;
}

interface UseMealRecordsReturn {
  mealRecords: MealRecordWithItems[];
  isLoading: boolean;
  addMealRecord: (
    record: Omit<MealRecordWithItems, "id">,
    imageBase64?: string
  ) => Promise<void>;
  removeMealRecord: (id: string) => Promise<void>;
  getTodayMeals: () => MealRecordWithItems[];
  getTodayNutrition: () => NutritionData;
  getWeeklyData: () => { date: string; nutrition: NutritionData }[];
  refresh: () => Promise<void>;
}

const EMPTY_NUTRITION: NutritionData = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  phenylalanine_mg: 0,
};

// 오늘 날짜인지 확인
const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// 최근 7일 내인지 확인
const isWithinWeek = (dateString: string): boolean => {
  const date = new Date(dateString);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
};

// 영양소 합산
const sumNutrition = (records: MealRecordWithItems[]): NutritionData => {
  return records.reduce(
    (acc, record) => ({
      calories: acc.calories + record.totalNutrition.calories,
      protein_g: acc.protein_g + record.totalNutrition.protein_g,
      carbs_g: acc.carbs_g + record.totalNutrition.carbs_g,
      fat_g: acc.fat_g + record.totalNutrition.fat_g,
      phenylalanine_mg:
        (acc.phenylalanine_mg || 0) +
        (record.totalNutrition.phenylalanine_mg || 0),
    }),
    { ...EMPTY_NUTRITION }
  );
};

export function useMealRecords(): UseMealRecordsReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const localStore = useNutritionStore();
  const [dbRecords, setDbRecords] = useState<MealRecordWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Supabase에서 식사 기록 조회
  const fetchRecords = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 최근 7일 기록만 조회
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mealRecords, error: mealError } = await (supabase as any)
        .from("meal_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("timestamp", weekAgo.toISOString())
        .order("timestamp", { ascending: false });

      if (mealError) throw mealError;

      // 각 식사 기록의 음식 아이템 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordIds = (mealRecords as any[])?.map((r: any) => r.id) || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: foodItems, error: foodError } = await (supabase as any)
        .from("food_items")
        .select("*")
        .in("meal_record_id", recordIds);

      if (foodError) throw foodError;

      // 데이터 결합
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: MealRecordWithItems[] = ((mealRecords as any[]) || []).map((record: any) => ({
        id: record.id,
        timestamp: record.timestamp,
        mealType: record.meal_type as MealType,
        imageUrl: record.image_url,
        totalNutrition: record.total_nutrition as NutritionData,
        aiConfidence: record.ai_confidence,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: ((foodItems as any[]) || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.meal_record_id === record.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            estimatedWeight_g: item.weight_g || 0,
            nutrition: item.nutrition as NutritionData,
            confidence: item.confidence || 0,
            userVerified: item.user_verified,
          })),
      }));

      setDbRecords(records);
    } catch (error) {
      console.error("식사 기록 조회 실패:", error);
      toast.error("식사 기록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // 초기 로드
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchRecords();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, fetchRecords]);

  // 인증 상태에 따른 데이터 소스 선택
  const mealRecords: MealRecordWithItems[] = isAuthenticated
    ? dbRecords
    : localStore.mealRecords.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        mealType: r.mealType,
        imageUrl: null,
        items: r.items,
        totalNutrition: r.totalNutrition,
        aiConfidence: null,
      }));

  // 식사 기록 추가
  const addMealRecord = useCallback(
    async (
      record: Omit<MealRecordWithItems, "id">,
      imageBase64?: string
    ) => {
      if (!isAuthenticated) {
        // 로컬 스토어에 저장
        localStore.addMealRecord({
          id: `meal-${Date.now()}`,
          timestamp: record.timestamp,
          mealType: record.mealType,
          imageBase64,
          items: record.items,
          totalNutrition: record.totalNutrition,
        });
        return;
      }

      if (!user) return;

      try {
        // 이미지 업로드 (있는 경우)
        let imageUrl: string | null = null;
        if (imageBase64) {
          const { url } = await uploadMealImage(imageBase64, user.id);
          imageUrl = url;
        }

        // 식사 기록 저장
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: mealRecord, error: mealError } = await (supabase as any)
          .from("meal_records")
          .insert({
            user_id: user.id,
            timestamp: record.timestamp,
            meal_type: record.mealType,
            image_url: imageUrl,
            total_nutrition: record.totalNutrition,
            ai_confidence: record.aiConfidence,
          })
          .select()
          .single();

        if (mealError) throw mealError;

        // 음식 아이템 저장
        const foodItemsToInsert = record.items.map((item) => ({
          meal_record_id: mealRecord.id,
          name: item.name,
          weight_g: item.estimatedWeight_g,
          nutrition: item.nutrition,
          confidence: item.confidence,
          user_verified: item.userVerified,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: foodError } = await (supabase as any)
          .from("food_items")
          .insert(foodItemsToInsert);

        if (foodError) throw foodError;

        // 로컬 상태 업데이트
        await fetchRecords();
        toast.success("식사 기록이 저장되었습니다!");
      } catch (error) {
        console.error("식사 기록 저장 실패:", error);
        toast.error("식사 기록 저장에 실패했습니다.");
        throw error;
      }
    },
    [isAuthenticated, user, supabase, localStore, fetchRecords]
  );

  // 식사 기록 삭제
  const removeMealRecord = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        localStore.removeMealRecord(id);
        return;
      }

      try {
        // 이미지 URL 조회
        const record = dbRecords.find((r) => r.id === id);
        if (record?.imageUrl) {
          // URL에서 path 추출
          const url = new URL(record.imageUrl);
          const path = url.pathname.split("/").slice(-2).join("/");
          await deleteMealImage(path).catch(console.error);
        }

        // 식사 기록 삭제 (cascade로 food_items도 삭제됨)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("meal_records")
          .delete()
          .eq("id", id);

        if (error) throw error;

        // 로컬 상태 업데이트
        await fetchRecords();
        toast.success("기록이 삭제되었습니다.");
      } catch (error) {
        console.error("식사 기록 삭제 실패:", error);
        toast.error("삭제에 실패했습니다.");
        throw error;
      }
    },
    [isAuthenticated, dbRecords, supabase, localStore, fetchRecords]
  );

  // 오늘의 식사
  const getTodayMeals = useCallback(() => {
    return mealRecords.filter((r) => isToday(r.timestamp));
  }, [mealRecords]);

  // 오늘의 영양소
  const getTodayNutrition = useCallback(() => {
    const todayMeals = mealRecords.filter((r) => isToday(r.timestamp));
    return sumNutrition(todayMeals);
  }, [mealRecords]);

  // 주간 데이터
  const getWeeklyData = useCallback(() => {
    const weeklyRecords = mealRecords.filter((r) => isWithinWeek(r.timestamp));

    // 날짜별로 그룹화
    const byDate = weeklyRecords.reduce(
      (acc, record) => {
        const date = new Date(record.timestamp).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(record);
        return acc;
      },
      {} as Record<string, MealRecordWithItems[]>
    );

    // 최근 7일 데이터 생성
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        nutrition: byDate[dateStr]
          ? sumNutrition(byDate[dateStr])
          : EMPTY_NUTRITION,
      });
    }

    return result;
  }, [mealRecords]);

  return {
    mealRecords,
    isLoading: isLoading || authLoading,
    addMealRecord,
    removeMealRecord,
    getTodayMeals,
    getTodayNutrition,
    getWeeklyData,
    refresh: fetchRecords,
  };
}
