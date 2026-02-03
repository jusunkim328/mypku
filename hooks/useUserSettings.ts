"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { UserMode, DailyGoals } from "@/types/nutrition";

/**
 * 사용자 설정 통합 훅
 *
 * - 로그인 상태: Supabase 데이터 우선, localStorage 백업
 * - 비로그인 상태: localStorage만 사용
 *
 * 설정 변경 시:
 * - 로그인: Supabase 업데이트 + localStorage 백업
 * - 비로그인: localStorage만 저장
 */
export function useUserSettings() {
  const {
    isAuthenticated,
    profile,
    dailyGoals: dbGoals,
    updateProfile,
    updateDailyGoals: updateDbGoals,
  } = useAuth();

  const localStore = useNutritionStore();

  // mode: 로그인 시 Supabase 우선, 비로그인 시 localStorage
  const mode: UserMode = isAuthenticated && profile?.mode
    ? profile.mode
    : localStore.mode;

  // dailyGoals: 로그인 시 Supabase 우선, 비로그인 시 localStorage
  const dailyGoals: DailyGoals = isAuthenticated && dbGoals
    ? {
        calories: dbGoals.calories,
        protein_g: dbGoals.protein_g,
        carbs_g: dbGoals.carbs_g,
        fat_g: dbGoals.fat_g,
        phenylalanine_mg: dbGoals.phenylalanine_mg,
      }
    : localStore.dailyGoals;

  // mode 변경
  const setMode = useCallback(async (newMode: UserMode) => {
    // localStorage에 항상 저장 (오프라인 백업)
    localStore.setMode(newMode);

    // 로그인 상태면 Supabase도 업데이트
    if (isAuthenticated) {
      try {
        await updateProfile({ mode: newMode });
      } catch (error) {
        console.error("[useUserSettings] mode 업데이트 실패:", error);
        // Supabase 실패해도 localStorage에는 저장됨
      }
    }
  }, [isAuthenticated, updateProfile, localStore]);

  // dailyGoals 변경
  const setDailyGoals = useCallback(async (goals: Partial<DailyGoals>) => {
    // localStorage에 항상 저장 (오프라인 백업)
    localStore.setDailyGoals(goals);

    // 로그인 상태면 Supabase도 업데이트
    if (isAuthenticated) {
      try {
        await updateDbGoals(goals);
      } catch (error) {
        console.error("[useUserSettings] dailyGoals 업데이트 실패:", error);
        // Supabase 실패해도 localStorage에는 저장됨
      }
    }
  }, [isAuthenticated, updateDbGoals, localStore]);

  // Water 관련 (Phase 1에서는 localStorage만 사용)
  const {
    waterGoal,
    setWaterGoal,
    waterIntakes,
    addWaterGlass,
    removeWaterGlass,
    getTodayWaterIntake,
    getWaterIntakeByDate,
  } = localStore;

  // Exchange 계산 함수들
  const { getExchanges, getTodayExchanges } = localStore;

  // getExchangeGoal은 현재 dailyGoals 기준으로 계산 (Supabase 우선)
  const getExchangeGoal = useCallback(() => {
    const pheGoal = dailyGoals.phenylalanine_mg || 300;
    return getExchanges(pheGoal);
  }, [dailyGoals.phenylalanine_mg, getExchanges]);

  return {
    // 동기화되는 설정
    mode,
    setMode,
    dailyGoals,
    setDailyGoals,

    // Water (localStorage만)
    waterGoal,
    setWaterGoal,
    waterIntakes,
    addWaterGlass,
    removeWaterGlass,
    getTodayWaterIntake,
    getWaterIntakeByDate,

    // Exchange 계산 함수
    getExchanges,
    getTodayExchanges,
    getExchangeGoal,

    // 하이드레이션 상태
    _hasHydrated: localStore._hasHydrated,

    // 인증 상태 (편의용)
    isAuthenticated,
  };
}
