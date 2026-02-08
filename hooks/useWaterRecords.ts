"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { usePatientContext, useTargetUserId, useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";
import { getDevAuthState } from "@/lib/devAuth";

interface UseWaterRecordsReturn {
  todayIntake: number;
  waterGoal: number;
  addGlass: () => Promise<void>;
  removeGlass: () => Promise<void>;
  isLoading: boolean;
}

const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0];
};

export function useWaterRecords(): UseWaterRecordsReturn {
  const { user, isAuthenticated } = useAuth();
  const localStore = useNutritionStore();
  const [dbGlasses, setDbGlasses] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 보호자 모드 지원
  const activePatient = usePatientContext((s) => s.activePatient);
  const queryUserId = useTargetUserId(user?.id);
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();

  const supabaseRef = useRef(createClient());
  const today = getTodayDateStr();

  // 환자 전환 시 캐시 초기화
  // 주의: undefined ?? null 변환 시 StrictMode에서 null !== undefined 비교 오류 발생
  const prevPatientIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPatientIdRef.current !== undefined && prevPatientIdRef.current !== activePatient?.id) {
      setDbGlasses(null);
    }
    prevPatientIdRef.current = activePatient?.id;
  }, [activePatient?.id]);

  // Supabase에서 오늘의 수분 기록 조회
  const fetchWater = useCallback(async () => {
    if (!queryUserId) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled && !isCaregiverMode) return;

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseRef.current as any)
        .from("water_intakes")
        .select("glasses")
        .eq("user_id", queryUserId)
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;
      setDbGlasses(data?.glasses ?? 0);
    } catch (error) {
      console.error("[useWaterRecords] 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryUserId, isCaregiverMode, today]);

  // 초기 로드
  useEffect(() => {
    if ((isAuthenticated || isCaregiverMode)) {
      fetchWater();
    }
  }, [isAuthenticated, isCaregiverMode, fetchWater]);

  // 현재 수분 섭취량 (데이터 소스 분기)
  const localIntake = localStore.getTodayWaterIntake();
  const todayIntake = useMemo(() => {
    if (isCaregiverMode) {
      return dbGlasses ?? 0;
    }
    const devAuthState = getDevAuthState();
    const useLocal = !isAuthenticated || devAuthState.enabled;
    if (useLocal) {
      return localIntake;
    }
    return dbGlasses ?? localIntake;
  }, [isCaregiverMode, isAuthenticated, dbGlasses, localIntake]);

  // waterGoal: 보호자 모드에서는 기본값 8잔 사용 (환자의 waterGoal은 localStorage에만 있어서 조회 불가)
  const DEFAULT_WATER_GOAL = 8;
  const waterGoal = isCaregiverMode ? DEFAULT_WATER_GOAL : localStore.waterGoal;

  // Supabase upsert 헬퍼
  const upsertGlasses = useCallback(async (targetUserId: string, newGlasses: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseRef.current as any)
      .from("water_intakes")
      .upsert({
        user_id: targetUserId,
        date: today,
        glasses: Math.max(0, newGlasses),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,date" });

    if (error) throw error;
  }, [today]);

  // 물잔 추가
  const addGlass = useCallback(async () => {
    if (isCaregiverMode && !canEdit) return;

    const devAuthState = getDevAuthState();
    const useLocal = isCaregiverMode ? false : (!isAuthenticated || devAuthState.enabled);

    // 보호자 모드가 아닐 때만 localStorage 반영
    if (!isCaregiverMode) {
      localStore.addWaterGlass();
    }

    if (useLocal) return;
    if (!queryUserId) return;

    const currentGlasses = isCaregiverMode ? (dbGlasses ?? 0) : todayIntake;
    const newGlasses = currentGlasses + 1;

    // Optimistic update
    setDbGlasses(newGlasses);

    try {
      await upsertGlasses(queryUserId, newGlasses);
    } catch (error) {
      console.error("[useWaterRecords] 추가 실패:", error);
      // 롤백
      setDbGlasses(currentGlasses);
      if (!isCaregiverMode) {
        localStore.removeWaterGlass();
      }
    }
  }, [isAuthenticated, queryUserId, canEdit, isCaregiverMode, localStore, dbGlasses, todayIntake, upsertGlasses]);

  // 물잔 제거
  const removeGlass = useCallback(async () => {
    if (isCaregiverMode && !canEdit) return;

    const devAuthState = getDevAuthState();
    const useLocal = isCaregiverMode ? false : (!isAuthenticated || devAuthState.enabled);

    if (!isCaregiverMode) {
      localStore.removeWaterGlass();
    }

    if (useLocal) return;
    if (!queryUserId) return;

    const currentGlasses = isCaregiverMode ? (dbGlasses ?? 0) : todayIntake;
    const newGlasses = Math.max(0, currentGlasses - 1);

    // Optimistic update
    setDbGlasses(newGlasses);

    try {
      await upsertGlasses(queryUserId, newGlasses);
    } catch (error) {
      console.error("[useWaterRecords] 제거 실패:", error);
      setDbGlasses(currentGlasses);
      if (!isCaregiverMode) {
        localStore.addWaterGlass();
      }
    }
  }, [isAuthenticated, queryUserId, canEdit, isCaregiverMode, localStore, dbGlasses, todayIntake, upsertGlasses]);

  return {
    todayIntake,
    waterGoal,
    addGlass,
    removeGlass,
    isLoading,
  };
}
