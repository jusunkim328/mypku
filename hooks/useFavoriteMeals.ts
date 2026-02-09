"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientContext, useTargetUserId } from "./usePatientContext";
import { useNetworkStatus } from "./useNetworkStatus";
import { toast } from "./useToast";
import { getDevAuthState } from "@/lib/devAuth";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";
import type { FavoriteMealRow, Json } from "@/lib/supabase/types";

export interface FavoriteMeal {
  id: string;
  name: string;
  items: FoodItem[];
  totalNutrition: NutritionData;
  mealType: MealType;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface FavoriteMealsLocalStore {
  favorites: FavoriteMeal[];
  addFavorite: (fav: FavoriteMeal) => void;
  removeFavorite: (id: string) => void;
  recordUse: (id: string) => void;
}

const useLocalFavoritesStore = create<FavoriteMealsLocalStore>()(
  persist(
    (set) => ({
      favorites: [],
      addFavorite: (fav) =>
        set((state) => ({
          favorites: [fav, ...state.favorites],
        })),
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),
      recordUse: (id) =>
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.id === id
              ? { ...f, useCount: f.useCount + 1, lastUsedAt: new Date().toISOString() }
              : f
          ),
        })),
    }),
    { name: "mypku-favorites-storage" }
  )
);

function rowToFavoriteMeal(row: FavoriteMealRow): FavoriteMeal {
  // items 검증: 배열이 아니거나 빈 경우 빈 배열
  const rawItems: unknown = row.items;
  const items: FoodItem[] = Array.isArray(rawItems)
    ? (rawItems as unknown[]).filter(
        (item): item is FoodItem =>
          item != null &&
          typeof item === "object" &&
          "name" in item &&
          "nutrition" in item
      )
    : [];

  // totalNutrition 검증: 필수 필드 fallback
  const rawNutrition = row.total_nutrition as Record<string, unknown> | null;
  const totalNutrition: NutritionData = {
    calories: Number(rawNutrition?.calories) || 0,
    protein_g: Number(rawNutrition?.protein_g) || 0,
    carbs_g: Number(rawNutrition?.carbs_g) || 0,
    fat_g: Number(rawNutrition?.fat_g) || 0,
    phenylalanine_mg: Number(rawNutrition?.phenylalanine_mg) || 0,
  };

  // mealType 검증
  const validMealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
  const mealType: MealType = validMealTypes.includes(
    row.meal_type as (typeof validMealTypes)[number]
  )
    ? (row.meal_type as MealType)
    : "snack";

  return {
    id: row.id,
    name: row.name,
    items,
    totalNutrition,
    mealType,
    useCount: row.use_count ?? 0,
    lastUsedAt: row.last_used_at ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

interface UseFavoriteMealsReturn {
  favorites: FavoriteMeal[];
  isLoading: boolean;
  addFavorite: (
    name: string,
    items: FoodItem[],
    totalNutrition: NutritionData,
    mealType: MealType
  ) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  recordUse: (id: string) => Promise<void>;
}

export function useFavoriteMeals(): UseFavoriteMealsReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const localStore = useLocalFavoritesStore();
  const [dbFavorites, setDbFavorites] = useState<FavoriteMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isOnline = useNetworkStatus();

  const activePatient = usePatientContext((s) => s.activePatient);
  const queryUserId = useTargetUserId(user?.id);

  const supabase = createClient();

  // 로컬 스토리지 사용 여부 판단
  const useLocal = !isAuthenticated || getDevAuthState().enabled || !isOnline;

  // 환자 전환 시 캐시 초기화
  const prevPatientIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPatientIdRef.current !== undefined && prevPatientIdRef.current !== activePatient?.id) {
      setDbFavorites([]);
      setIsLoading(true);
    }
    prevPatientIdRef.current = activePatient?.id;
  }, [activePatient?.id]);

  // Supabase에서 즐겨찾기 조회
  const fetchFavorites = useCallback(async () => {
    if (!queryUserId || useLocal) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorite_meals")
        .select("*")
        .eq("user_id", queryUserId)
        .order("use_count", { ascending: false });

      if (error) throw error;

      setDbFavorites((data ?? []).map(rowToFavoriteMeal));
    } catch (error) {
      console.error("즐겨찾기 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryUserId, useLocal]);

  // 초기 로드
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && !useLocal) {
        fetchFavorites();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, useLocal, fetchFavorites]);

  // 데이터 소스 선택
  const favorites: FavoriteMeal[] = useLocal
    ? [...localStore.favorites].sort((a, b) => b.useCount - a.useCount)
    : dbFavorites;

  // 즐겨찾기 추가
  const addFavorite = useCallback(
    async (
      name: string,
      items: FoodItem[],
      totalNutrition: NutritionData,
      mealType: MealType
    ) => {
      const newFavorite: FavoriteMeal = {
        id: crypto.randomUUID(),
        name,
        items,
        totalNutrition,
        mealType,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      };

      if (useLocal) {
        localStore.addFavorite(newFavorite);
        return;
      }

      if (!queryUserId) return;

      try {
        const { error } = await supabase
          .from("favorite_meals")
          .insert({
            user_id: queryUserId,
            name,
            items: items as unknown as Json,
            total_nutrition: totalNutrition as unknown as Json,
            meal_type: mealType,
            use_count: 0,
          });

        if (error) throw error;

        await fetchFavorites();
      } catch (error) {
        console.error("즐겨찾기 추가 실패:", error);
        localStore.addFavorite(newFavorite);
        toast.error("즐겨찾기 추가에 실패했습니다.");
      }
    },
    [useLocal, queryUserId, localStore, fetchFavorites]
  );

  // 즐겨찾기 삭제
  const removeFavorite = useCallback(
    async (id: string) => {
      if (useLocal) {
        localStore.removeFavorite(id);
        return;
      }

      try {
        const { error } = await supabase
          .from("favorite_meals")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await fetchFavorites();
      } catch (error) {
        console.error("즐겨찾기 삭제 실패:", error);
        toast.error("삭제에 실패했습니다.");
      }
    },
    [useLocal, localStore, fetchFavorites]
  );

  // 사용 횟수 기록
  const recordUse = useCallback(
    async (id: string) => {
      if (useLocal) {
        localStore.recordUse(id);
        return;
      }

      try {
        const fav = dbFavorites.find((f) => f.id === id);
        if (!fav) return;

        const { error } = await supabase
          .from("favorite_meals")
          .update({
            use_count: fav.useCount + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        await fetchFavorites();
      } catch (error) {
        console.error("사용 횟수 기록 실패:", error);
      }
    },
    [useLocal, dbFavorites, localStore, fetchFavorites]
  );

  return {
    favorites,
    isLoading: isLoading || authLoading,
    addFavorite,
    removeFavorite,
    recordUse,
  };
}
