"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFormulaStore } from "./useFormulaStore";
import { useUserSettings } from "./useUserSettings";
import { getDevAuthState } from "@/lib/devAuth";

interface FormulaIntake {
  date: string;
  slot: string;
  completed: boolean;
  completedAt: string | null;
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

  const supabase = createClient();
  const today = getTodayDateStr();

  const isFormulaActive = formulaSettings?.isActive ?? false;
  const timeSlots = formulaSettings?.timeSlots ?? [];
  const formulaName = formulaSettings?.formulaName ?? "PKU Formula";
  const servingLabel = formulaSettings
    ? `${formulaSettings.servingAmount}${formulaSettings.servingUnit}`
    : "";

  // Supabase에서 오늘의 섭취 기록 조회
  const fetchIntakes = useCallback(async () => {
    if (!user || !isFormulaActive) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled) return;

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("formula_intakes")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intakes: FormulaIntake[] = ((data as any[]) || []).map((row: any) => ({
        date: row.date,
        slot: row.time_slot,
        completed: row.completed,
        completedAt: row.completed_at,
      }));

      setDbIntakes(intakes);
    } catch (error) {
      console.error("[useFormulaRecords] 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isFormulaActive, supabase, today]);

  // 초기 로드
  useEffect(() => {
    if (isAuthenticated && isFormulaActive) {
      fetchIntakes();
    }
  }, [isAuthenticated, isFormulaActive, fetchIntakes]);

  // 데이터 소스에 따른 완료 여부 확인
  const isSlotCompleted = useCallback(
    (slot: string): boolean => {
      const devAuthState = getDevAuthState();
      const useLocal = !isAuthenticated || devAuthState.enabled;

      if (useLocal) {
        return localStore.isSlotCompleted(today, slot);
      }
      return dbIntakes.find((i) => i.slot === slot)?.completed ?? false;
    },
    [isAuthenticated, localStore, dbIntakes, today]
  );

  // 완료 수 계산
  const completedCount = timeSlots.filter((slot) =>
    isSlotCompleted(slot)
  ).length;

  // 슬롯 토글
  const toggleSlot = useCallback(
    async (slot: string) => {
      const devAuthState = getDevAuthState();
      const useLocal = !isAuthenticated || devAuthState.enabled;

      // localStorage 토글 (항상)
      localStore.toggleSlot(today, slot);

      if (useLocal) return;

      // Supabase upsert
      if (!user) return;

      const currentlyCompleted = isSlotCompleted(slot);
      const newCompleted = !currentlyCompleted;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("formula_intakes")
          .upsert(
            {
              user_id: user.id,
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
        // 실패 시 localStorage 롤백
        localStore.toggleSlot(today, slot);
      }
    },
    [isAuthenticated, user, supabase, localStore, today, isSlotCompleted]
  );

  return {
    isFormulaActive,
    timeSlots,
    formulaName,
    servingLabel,
    toggleSlot,
    isSlotCompleted,
    completedCount,
    isLoading,
  };
}
