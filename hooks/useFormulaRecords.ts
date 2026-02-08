"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFormulaStore } from "./useFormulaStore";
import { useUserSettings } from "./useUserSettings";
import { usePatientContext, useTargetUserId, useCanEdit, useIsCaregiverMode } from "./usePatientContext";
import { getDevAuthState } from "@/lib/devAuth";

interface FormulaIntake {
  date: string;
  slot: string;
  completed: boolean;
  completedAt: string | null;
}

interface FormulaDaySummary {
  date: string;
  completedSlots: number;
  totalSlots: number;
}

interface UseFormulaRecordsReturn {
  // 포뮬러 활성 여부
  isFormulaActive: boolean;

  // 오늘의 슬롯 목록 (설정에서)
  timeSlots: string[];

  // 포뮬러 이름/용량 정보
  formulaName: string;
  servingLabel: string;

  // 슬롯 토글
  toggleSlot: (slot: string) => Promise<void>;

  // 슬롯 완료 여부
  isSlotCompleted: (slot: string) => boolean;

  // 오늘 완료 수
  completedCount: number;

  // 날짜 범위 포뮬러 요약 조회
  fetchFormulaSummary: (dates: string[]) => Promise<FormulaDaySummary[]>;

  // 로딩 상태
  isLoading: boolean;
}

const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0];
};

export function useFormulaRecords(): UseFormulaRecordsReturn {
  const { user, isAuthenticated } = useAuth();
  const { formulaSettings } = useUserSettings();
  const localStore = useFormulaStore();
  const [dbIntakes, setDbIntakes] = useState<FormulaIntake[]>([]);
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
      setDbIntakes([]);
    }
    prevPatientIdRef.current = activePatient?.id;
  }, [activePatient?.id]);

  const isFormulaActive = formulaSettings?.isActive ?? false;
  const timeSlots = formulaSettings?.timeSlots ?? [];
  const formulaName = formulaSettings?.formulaName ?? "PKU Formula";
  const servingLabel = formulaSettings
    ? `${formulaSettings.servingAmount}${formulaSettings.servingUnit}`
    : "";

  // Supabase에서 오늘의 섭취 기록 조회
  const fetchIntakes = useCallback(async () => {
    if (!queryUserId || !isFormulaActive) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled && !isCaregiverMode) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabaseRef.current
        .from("formula_intakes")
        .select("*")
        .eq("user_id", queryUserId)
        .eq("date", today);

      if (error) throw error;

      const intakes: FormulaIntake[] = (data || []).map((row) => ({
        date: row.date,
        slot: row.time_slot,
        completed: row.completed ?? false,
        completedAt: row.completed_at,
      }));

      setDbIntakes(intakes);
    } catch (error) {
      console.error("[useFormulaRecords] 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryUserId, isFormulaActive, isCaregiverMode, today]);

  // 초기 로드 + 환자 전환 시 재fetch
  useEffect(() => {
    if ((isAuthenticated || isCaregiverMode) && isFormulaActive) {
      fetchIntakes();
    }
  }, [isAuthenticated, isCaregiverMode, isFormulaActive, fetchIntakes]);

  // 데이터 소스에 따른 완료 여부 확인
  const isSlotCompleted = useCallback(
    (slot: string): boolean => {
      if (isCaregiverMode) {
        return dbIntakes.find((i) => i.slot === slot)?.completed ?? false;
      }

      const devAuthState = getDevAuthState();
      const useLocal = !isAuthenticated || devAuthState.enabled;

      if (useLocal) {
        return localStore.isSlotCompleted(today, slot);
      }
      return dbIntakes.find((i) => i.slot === slot)?.completed ?? false;
    },
    [isAuthenticated, isCaregiverMode, localStore, dbIntakes, today]
  );

  // 완료 수 계산
  const completedCount = timeSlots.filter((slot) =>
    isSlotCompleted(slot)
  ).length;

  // 슬롯 토글
  const toggleSlot = useCallback(
    async (slot: string) => {
      // 보호자 모드: canEdit 검증
      if (isCaregiverMode && !canEdit) return;

      const devAuthState = getDevAuthState();
      const useLocal = isCaregiverMode ? false : (!isAuthenticated || devAuthState.enabled);

      // 보호자 모드가 아닐 때만 localStorage 토글
      if (!isCaregiverMode) {
        localStore.toggleSlot(today, slot);
      }

      if (useLocal) return;

      // Supabase upsert
      if (!queryUserId || !user) return;

      const currentlyCompleted = isSlotCompleted(slot);
      const newCompleted = !currentlyCompleted;

      try {
        const { error } = await supabaseRef.current
          .from("formula_intakes")
          .upsert(
            {
              user_id: queryUserId,
              created_by: user.id,
              date: today,
              time_slot: slot,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            },
            {
              onConflict: "user_id,date,time_slot",
            }
          );

        if (error) throw error;

        // DB 상태 업데이트
        setDbIntakes((prev) => {
          const existing = prev.findIndex((i) => i.slot === slot);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : null,
            };
            return updated;
          }
          return [
            ...prev,
            {
              date: today,
              slot,
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : null,
            },
          ];
        });
      } catch (error) {
        console.error("[useFormulaRecords] 토글 실패:", error);
        // 실패 시 localStorage 롤백 (보호자 모드 아닐 때만)
        if (!isCaregiverMode) {
          localStore.toggleSlot(today, slot);
        }
      }
    },
    [isAuthenticated, user, queryUserId, canEdit, isCaregiverMode, localStore, today, isSlotCompleted]
  );

  // 날짜 범위 포뮬러 요약 조회 (DB 또는 localStorage)
  const fetchFormulaSummary = useCallback(
    async (dates: string[]): Promise<FormulaDaySummary[]> => {
      if (!isFormulaActive || dates.length === 0) {
        return dates.map((date) => ({ date, completedSlots: 0, totalSlots: timeSlots.length }));
      }

      const devAuthState = getDevAuthState();
      const useLocal = !isAuthenticated || devAuthState.enabled;

      if (useLocal && !isCaregiverMode) {
        // localStorage에서 날짜별 조회
        return dates.map((date) => ({
          date,
          completedSlots: localStore.getCompletedCount(date, timeSlots),
          totalSlots: timeSlots.length,
        }));
      }

      // DB에서 날짜 범위 조회
      if (!queryUserId) {
        return dates.map((date) => ({ date, completedSlots: 0, totalSlots: timeSlots.length }));
      }

      try {
        const sortedDates = [...dates].sort();
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];

        const { data, error } = await supabaseRef.current
          .from("formula_intakes")
          .select("date, time_slot, completed")
          .eq("user_id", queryUserId)
          .gte("date", startDate)
          .lte("date", endDate)
          .eq("completed", true);

        if (error) throw error;

        // 날짜별 완료 슬롯 수 집계
        const countByDate: Record<string, number> = {};
        for (const row of data || []) {
          countByDate[row.date] = (countByDate[row.date] || 0) + 1;
        }

        return dates.map((date) => ({
          date,
          completedSlots: countByDate[date] ?? 0,
          totalSlots: timeSlots.length,
        }));
      } catch (error) {
        console.error("[useFormulaRecords] 범위 조회 실패:", error);
        return dates.map((date) => ({ date, completedSlots: 0, totalSlots: timeSlots.length }));
      }
    },
    [isFormulaActive, isAuthenticated, isCaregiverMode, queryUserId, localStore, timeSlots]
  );

  return {
    isFormulaActive,
    timeSlots,
    formulaName,
    servingLabel,
    toggleSlot,
    isSlotCompleted,
    completedCount,
    fetchFormulaSummary,
    isLoading,
  };
}
