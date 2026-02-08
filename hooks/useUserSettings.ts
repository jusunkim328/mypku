"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { usePatientContext, useIsCaregiverMode } from "@/hooks/usePatientContext";
import { DEFAULT_DAILY_GOALS } from "@/types/nutrition";
import type { DailyGoals } from "@/types/nutrition";

interface FormulaSettingsDB {
  formulaName: string;
  servingAmount: number;
  servingUnit: "ml" | "g" | "scoop";
  timeSlots: string[];
  isActive: boolean;
}

/**
 * 사용자 설정 통합 훅 (PKU 전용)
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
    user,
    isAuthenticated,
    isLoading: authLoading,
    profile,
    updateProfile,
    dailyGoals: dbGoals,
    updateDailyGoals: updateDbGoals,
  } = useAuth();

  const localStore = useNutritionStore();
  const supabaseRef = useRef(createClient());

  // 보호자 모드 지원
  const activePatient = usePatientContext((s) => s.activePatient);
  const isCaregiverMode = useIsCaregiverMode();

  // 보호자 모드: 환자의 dailyGoals를 Supabase에서 직접 fetch
  const [patientGoals, setPatientGoals] = useState<DailyGoals | null>(null);
  const [patientFormulaSettings, setPatientFormulaSettings] = useState<FormulaSettingsDB | null>(null);

  // 자기 데이터: Supabase에서 가져온 formula_settings
  const [dbFormulaSettings, setDbFormulaSettings] = useState<FormulaSettingsDB | null>(null);
  const [formulaSettingsFetched, setFormulaSettingsFetched] = useState(false);

  // 자기 데이터: formula_settings Supabase 동기화
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setDbFormulaSettings(null);
      setFormulaSettingsFetched(false);
      return;
    }

    const fetchOwnFormulaSettings = async () => {
      try {
        const { data, error } = await supabaseRef.current
          .from("formula_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          setDbFormulaSettings({
            formulaName: data.formula_name,
            servingAmount: data.serving_amount,
            servingUnit: data.serving_unit as "ml" | "g" | "scoop",
            timeSlots: data.time_slots ?? [],
            isActive: data.is_active ?? false,
          });
        } else if (!error && !data && localStore.formulaSettings) {
          // Supabase에 데이터 없고 localStorage에 있으면 → 초기 마이그레이션
          const local = localStore.formulaSettings;
          await supabaseRef.current
            .from("formula_settings")
            .upsert({
              user_id: user.id,
              formula_name: local.formulaName,
              serving_amount: local.servingAmount,
              serving_unit: local.servingUnit,
              time_slots: local.timeSlots,
              is_active: local.isActive,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          setDbFormulaSettings(local);
        }
      } catch {
        console.error("[useUserSettings] formula_settings 조회 실패");
      } finally {
        setFormulaSettingsFetched(true);
      }
    };

    fetchOwnFormulaSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // 보호자 모드: 환자의 설정 fetch
  useEffect(() => {
    if (!isCaregiverMode || !activePatient) {
      setPatientGoals(null);
      setPatientFormulaSettings(null);
      return;
    }

    const fetchPatientSettings = async () => {
      try {
        // dailyGoals 조회
        const { data, error } = await supabaseRef.current
          .from("daily_goals")
          .select("*")
          .eq("user_id", activePatient.id)
          .maybeSingle();

        if (!error && data) {
          setPatientGoals({
            calories: data.calories ?? DEFAULT_DAILY_GOALS.calories,
            protein_g: data.protein_g ?? DEFAULT_DAILY_GOALS.protein_g,
            carbs_g: data.carbs_g ?? DEFAULT_DAILY_GOALS.carbs_g,
            fat_g: data.fat_g ?? DEFAULT_DAILY_GOALS.fat_g,
            phenylalanine_mg: data.phenylalanine_mg ?? DEFAULT_DAILY_GOALS.phenylalanine_mg,
          });
        } else {
          setPatientGoals(null);
        }

        // formula_settings 조회
        const { data: fsData, error: fsError } = await supabaseRef.current
          .from("formula_settings")
          .select("*")
          .eq("user_id", activePatient.id)
          .maybeSingle();

        if (!fsError && fsData) {
          setPatientFormulaSettings({
            formulaName: fsData.formula_name,
            servingAmount: fsData.serving_amount,
            servingUnit: fsData.serving_unit as "ml" | "g" | "scoop",
            timeSlots: fsData.time_slots ?? [],
            isActive: fsData.is_active ?? false,
          });
        } else {
          setPatientFormulaSettings(null);
        }
      } catch {
        console.error("[useUserSettings] 환자 설정 조회 실패");
      }
    };

    fetchPatientSettings();
  }, [isCaregiverMode, activePatient]);

  // ownDailyGoals: 항상 자기 자신의 목표 (Settings 페이지용)
  const ownDailyGoals: DailyGoals = useMemo(() => {
    if (isAuthenticated && dbGoals) {
      return {
        calories: dbGoals.calories ?? DEFAULT_DAILY_GOALS.calories,
        protein_g: dbGoals.protein_g ?? DEFAULT_DAILY_GOALS.protein_g,
        carbs_g: dbGoals.carbs_g ?? DEFAULT_DAILY_GOALS.carbs_g,
        fat_g: dbGoals.fat_g ?? DEFAULT_DAILY_GOALS.fat_g,
        phenylalanine_mg: dbGoals.phenylalanine_mg ?? DEFAULT_DAILY_GOALS.phenylalanine_mg,
      };
    }
    return localStore.dailyGoals;
  }, [
    isAuthenticated,
    dbGoals?.calories,
    dbGoals?.protein_g,
    dbGoals?.carbs_g,
    dbGoals?.fat_g,
    dbGoals?.phenylalanine_mg,
    localStore.dailyGoals,
  ]);

  // dailyGoals: 보호자 모드면 환자 것, 아니면 기존 로직 (대시보드용)
  const dailyGoals: DailyGoals = useMemo(() => {
    if (isCaregiverMode && patientGoals) {
      return patientGoals;
    }
    return ownDailyGoals;
  }, [isCaregiverMode, patientGoals, ownDailyGoals]);

  // dailyGoals 변경
  const setDailyGoals = useCallback(async (goals: Partial<DailyGoals>) => {
    if (!isCaregiverMode) {
      // 자기 데이터: localStorage + Supabase
      localStore.setDailyGoals(goals);
      if (isAuthenticated) {
        try {
          await updateDbGoals(goals);
        } catch (error) {
          console.error("[useUserSettings] dailyGoals 업데이트 실패:", error);
          throw error;
        }
      }
    } else {
      // 보호자 모드: Supabase 직접 + 로컬 캐시 갱신
      if (!activePatient || !isAuthenticated) return;

      try {
        await supabaseRef.current
          .from("daily_goals")
          .upsert({ user_id: activePatient.id, ...goals }, { onConflict: "user_id" });

        setPatientGoals(prev => prev
          ? { ...prev, ...goals } as DailyGoals
          : { ...DEFAULT_DAILY_GOALS, ...goals }
        );
      } catch (error) {
        console.error("[useUserSettings] 환자 dailyGoals 업데이트 실패:", error);
        throw error;
      }
    }
  }, [isAuthenticated, updateDbGoals, localStore, isCaregiverMode, activePatient]);

  // 퀵셋업/온보딩 상태: 로그인 → DB 우선, 비로그인 → localStorage
  const quickSetupCompleted = isAuthenticated
    ? (profile?.quicksetup_completed ?? localStore.quickSetupCompleted)
    : localStore.quickSetupCompleted;

  const onboardingCompleted = isAuthenticated
    ? (profile?.onboarding_completed ?? localStore.onboardingCompleted)
    : localStore.onboardingCompleted;

  const setQuickSetupCompleted = useCallback(async (completed: boolean) => {
    localStore.setQuickSetupCompleted(completed);
    if (isAuthenticated) {
      try {
        await updateProfile({ quicksetup_completed: completed });
      } catch (e) {
        console.error("[useUserSettings] quicksetup_completed DB 저장 실패:", e);
      }
    }
  }, [isAuthenticated, updateProfile, localStore]);

  const setOnboardingCompleted = useCallback(async (completed: boolean) => {
    localStore.setOnboardingCompleted(completed);
    if (isAuthenticated) {
      try {
        await updateProfile({ onboarding_completed: completed });
      } catch (e) {
        console.error("[useUserSettings] onboarding_completed DB 저장 실패:", e);
      }
    }
  }, [isAuthenticated, updateProfile, localStore]);

  // 온보딩 완료 일괄 처리 (단일 DB 호출)
  const completeOnboarding = useCallback(async () => {
    localStore.setQuickSetupCompleted(true);
    localStore.setOnboardingCompleted(true);
    if (isAuthenticated) {
      try {
        await updateProfile({ quicksetup_completed: true, onboarding_completed: true });
      } catch (e) {
        console.error("[useUserSettings] onboarding 완료 DB 저장 실패:", e);
      }
    }
  }, [isAuthenticated, updateProfile, localStore]);

  const { diagnosisAgeGroup, setDiagnosisAgeGroup } = localStore;

  // ownFormulaSettings: 항상 자기 자신의 설정 (Settings 페이지용)
  const ownFormulaSettings = useMemo(() => {
    if (isAuthenticated && formulaSettingsFetched && dbFormulaSettings) {
      return dbFormulaSettings;
    }
    return localStore.formulaSettings;
  }, [isAuthenticated, formulaSettingsFetched, dbFormulaSettings, localStore.formulaSettings]);

  // formulaSettings: 보호자 → 환자, 로그인 → Supabase 우선, 비로그인 → localStorage (대시보드용)
  const formulaSettings = useMemo(() => {
    if (isCaregiverMode) {
      return patientFormulaSettings ?? localStore.formulaSettings;
    }
    return ownFormulaSettings;
  }, [isCaregiverMode, patientFormulaSettings, localStore.formulaSettings, ownFormulaSettings]);

  // setFormulaSettings: localStorage + Supabase upsert
  const setFormulaSettings = useCallback(async (settings: FormulaSettingsDB | null) => {
    if (!isCaregiverMode) {
      // 자기 데이터: localStorage + 로컬 state
      localStore.setFormulaSettings(settings);
      setDbFormulaSettings(settings);
    } else {
      // 보호자 모드: 로컬 캐시만 (환자 state)
      setPatientFormulaSettings(settings);
    }

    // 로그인 상태면 Supabase도 업데이트
    if (isAuthenticated && settings) {
      const targetId = isCaregiverMode ? activePatient?.id : user?.id;
      if (!targetId) return;

      try {
        await supabaseRef.current
          .from("formula_settings")
          .upsert({
            user_id: targetId,
            formula_name: settings.formulaName,
            serving_amount: settings.servingAmount,
            serving_unit: settings.servingUnit,
            time_slots: settings.timeSlots,
            is_active: settings.isActive,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      } catch (error) {
        console.error("[useUserSettings] formula_settings 업데이트 실패:", error);
        throw error;
      }
    }
  }, [isAuthenticated, user, localStore, isCaregiverMode, activePatient]);

  // Exchange 계산 함수들
  const { getExchanges, getTodayExchanges } = localStore;

  // getExchangeGoal은 현재 dailyGoals 기준으로 계산 (Supabase 우선)
  const getExchangeGoal = useCallback(() => {
    const pheGoal = dailyGoals.phenylalanine_mg || DEFAULT_DAILY_GOALS.phenylalanine_mg;
    return getExchanges(pheGoal);
  }, [dailyGoals.phenylalanine_mg, getExchanges]);

  return {
    // 퀵셋업/온보딩 상태
    quickSetupCompleted,
    setQuickSetupCompleted,
    onboardingCompleted,
    setOnboardingCompleted,
    completeOnboarding,
    diagnosisAgeGroup,
    setDiagnosisAgeGroup,
    formulaSettings,
    ownFormulaSettings,
    setFormulaSettings,

    // 동기화되는 설정 (PKU 전용)
    dailyGoals,
    ownDailyGoals,
    setDailyGoals,

    // Exchange 설정 및 계산 함수 (PKU 전용)
    phePerExchange: localStore.phePerExchange,
    setPhePerExchange: localStore.setPhePerExchange,
    getExchanges,
    getTodayExchanges,
    getExchangeGoal,

    // 하이드레이션 상태
    _hasHydrated: localStore._hasHydrated,

    // 인증 상태 (편의용)
    isAuthenticated,
    authLoading,
  };
}
