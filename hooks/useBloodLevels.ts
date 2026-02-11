"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientContext, useTargetUserId, useCanEdit, useIsCaregiverMode } from "./usePatientContext";
import { getDevAuthState } from "@/lib/devAuth";

// 단위 변환: 1 mg/dL = 60.54 µmol/L
const MG_DL_TO_UMOL = 60.54;

export const mgDlToUmol = (value: number) => Math.round(value * MG_DL_TO_UMOL * 10) / 10;
export const umolToMgDl = (value: number) => Math.round((value / MG_DL_TO_UMOL) * 100) / 100;

export type BloodUnit = "umol" | "mg_dl";

export interface BloodLevelRecord {
  id: string;
  collectedAt: string; // ISO timestamp
  rawValue: number;
  rawUnit: BloodUnit;
  normalizedUmol: number;
  targetMin: number;
  targetMax: number;
  notes: string;
  createdAt: string;
}

export interface BloodLevelSettings {
  unit: BloodUnit;
  targetMin: number; // µmol/L
  targetMax: number; // µmol/L
  reminderIntervalDays: number | null; // null = 끄기, 7 | 14 | 30
}

// localStorage 스토어 (비로그인용)
interface BloodLevelStoreState {
  records: BloodLevelRecord[];
  settings: BloodLevelSettings;
  addRecord: (record: BloodLevelRecord) => void;
  removeRecord: (id: string) => void;
  setSettings: (settings: Partial<BloodLevelSettings>) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useBloodLevelStore = create<BloodLevelStoreState>()(
  persist(
    (set) => ({
      records: [],
      settings: {
        unit: "umol",
        targetMin: 120,
        targetMax: 360,
        reminderIntervalDays: 14,
      },

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records].sort(
            (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
          ),
        })),

      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),

      setSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-blood-levels-storage",
      version: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (state: any) => state,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        records: state.records,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state && state.settings.reminderIntervalDays === undefined) {
          state.setSettings({ reminderIntervalDays: 14 });
        }
      },
    }
  )
);

// 통합 훅
interface UseBloodLevelsReturn {
  records: BloodLevelRecord[];
  settings: BloodLevelSettings;
  isLoading: boolean;
  addRecord: (data: {
    collectedAt: string;
    value: number;
    unit: BloodUnit;
    notes?: string;
  }) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<BloodLevelSettings>) => void;
  getLatestRecord: () => BloodLevelRecord | null;
  getStatusLabel: (normalizedUmol: number) => "low" | "normal" | "high";
  daysSinceLastTest: number | null;
  daysUntilNextTest: number | null;
  isTestOverdue: boolean;
}

export function useBloodLevels(): UseBloodLevelsReturn {
  const { user, isAuthenticated } = useAuth();
  const localStore = useBloodLevelStore();
  const [dbRecords, setDbRecords] = useState<BloodLevelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 보호자 모드 지원
  const activePatient = usePatientContext((s) => s.activePatient);
  const queryUserId = useTargetUserId(user?.id);
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();

  const supabaseRef = useRef(createClient());

  // 환자 전환 시 캐시 초기화
  // 주의: undefined ?? null 변환 시 StrictMode에서 null !== undefined 비교 오류 발생
  // → 저장값과 비교값을 동일하게 유지 (undefined 그대로 보존)
  const prevPatientIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPatientIdRef.current !== undefined && prevPatientIdRef.current !== activePatient?.id) {
      setDbRecords([]);
      setIsLoading(true);
    }
    prevPatientIdRef.current = activePatient?.id;
  }, [activePatient?.id]);

  // Supabase에서 기록 조회
  const fetchRecords = useCallback(async () => {
    if (!queryUserId) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled && !isCaregiverMode) return;

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseRef.current as any)
        .from("blood_levels")
        .select("*")
        .eq("user_id", queryUserId)
        .order("collected_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: BloodLevelRecord[] = ((data as any[]) || []).map((row: any) => ({
        id: row.id,
        collectedAt: row.collected_at,
        rawValue: Number(row.raw_value),
        rawUnit: row.raw_unit as BloodUnit,
        normalizedUmol: Number(row.normalized_umol),
        targetMin: Number(row.target_min),
        targetMax: Number(row.target_max),
        notes: row.notes || "",
        createdAt: row.created_at,
      }));

      setDbRecords(records);
    } catch (error) {
      console.error("[useBloodLevels] 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [queryUserId, isCaregiverMode]);

  useEffect(() => {
    if (isAuthenticated || isCaregiverMode) {
      fetchRecords();
    }
  }, [isAuthenticated, isCaregiverMode, fetchRecords]);

  // 데이터 소스 선택
  // 보호자 모드: 항상 Supabase
  const devAuthState = getDevAuthState();
  const useLocal = isCaregiverMode ? false : (!isAuthenticated || devAuthState.enabled);
  const records = useLocal ? localStore.records : dbRecords;
  const settings = localStore.settings;

  // 기록 추가
  const addRecord = useCallback(
    async (data: {
      collectedAt: string;
      value: number;
      unit: BloodUnit;
      notes?: string;
    }) => {
      const normalizedUmol =
        data.unit === "mg_dl" ? mgDlToUmol(data.value) : data.value;

      const record: BloodLevelRecord = {
        id: crypto.randomUUID(),
        collectedAt: data.collectedAt,
        rawValue: data.value,
        rawUnit: data.unit,
        normalizedUmol,
        targetMin: settings.targetMin,
        targetMax: settings.targetMax,
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
      };

      // 보호자 모드: canEdit 검증
      if (isCaregiverMode && !canEdit) return;

      // 보호자 모드가 아닐 때만 localStorage에 저장
      if (!isCaregiverMode) {
        localStore.addRecord(record);
      }

      if (useLocal) return;

      // Supabase 저장
      if (!queryUserId || !user) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabaseRef.current as any)
          .from("blood_levels")
          .insert({
            user_id: queryUserId,
            created_by: user.id,
            collected_at: data.collectedAt,
            raw_value: data.value,
            raw_unit: data.unit,
            normalized_umol: normalizedUmol,
            target_min: settings.targetMin,
            target_max: settings.targetMax,
            notes: data.notes || "",
          });

        if (error) throw error;
        await fetchRecords();
      } catch (error) {
        console.error("[useBloodLevels] 저장 실패:", error);
      }
    },
    [user, queryUserId, canEdit, isCaregiverMode, useLocal, localStore, settings, fetchRecords]
  );

  // 기록 삭제
  const removeRecord = useCallback(
    async (id: string) => {
      if (isCaregiverMode && !canEdit) return;

      if (!isCaregiverMode) {
        localStore.removeRecord(id);
      }

      if (useLocal) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabaseRef.current as any)
          .from("blood_levels")
          .delete()
          .eq("id", id);

        if (error) throw error;
        await fetchRecords();
      } catch (error) {
        console.error("[useBloodLevels] 삭제 실패:", error);
      }
    },
    [canEdit, isCaregiverMode, useLocal, localStore, fetchRecords]
  );

  // 설정 업데이트
  const updateSettings = useCallback(
    (updates: Partial<BloodLevelSettings>) => {
      localStore.setSettings(updates);
    },
    [localStore]
  );

  // 최신 기록
  const getLatestRecord = useCallback((): BloodLevelRecord | null => {
    return records.length > 0 ? records[0] : null;
  }, [records]);

  // 상태 판정
  const getStatusLabel = useCallback(
    (normalizedUmol: number): "low" | "normal" | "high" => {
      if (normalizedUmol < settings.targetMin) return "low";
      if (normalizedUmol > settings.targetMax) return "high";
      return "normal";
    },
    [settings.targetMin, settings.targetMax]
  );

  // 리마인더 관련 값 (useMemo로 1회 계산)
  const daysSinceLastTest = useMemo((): number | null => {
    const latest = records.length > 0 ? records[0] : null;
    if (!latest) return null;
    const diffMs = Date.now() - new Date(latest.collectedAt).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [records]);

  const daysUntilNextTest = useMemo((): number | null => {
    const interval = settings.reminderIntervalDays;
    if (!interval) return null;
    if (daysSinceLastTest === null) return null;
    return Math.max(interval - daysSinceLastTest, 0);
  }, [settings.reminderIntervalDays, daysSinceLastTest]);

  const isTestOverdue = useMemo((): boolean => {
    const interval = settings.reminderIntervalDays;
    if (!interval) return false;
    if (daysSinceLastTest === null) return false;
    return daysSinceLastTest >= interval;
  }, [settings.reminderIntervalDays, daysSinceLastTest]);

  return {
    records,
    settings,
    isLoading,
    addRecord,
    removeRecord,
    updateSettings,
    getLatestRecord,
    getStatusLabel,
    daysSinceLastTest,
    daysUntilNextTest,
    isTestOverdue,
  };
}
