"use client";

import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        records: state.records,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
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
}

export function useBloodLevels(): UseBloodLevelsReturn {
  const { user, isAuthenticated } = useAuth();
  const localStore = useBloodLevelStore();
  const [dbRecords, setDbRecords] = useState<BloodLevelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  // Supabase에서 기록 조회
  const fetchRecords = useCallback(async () => {
    if (!user) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled) return;

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("blood_levels")
        .select("*")
        .eq("user_id", user.id)
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
  }, [user, supabase]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords();
    }
  }, [isAuthenticated, fetchRecords]);

  // 데이터 소스 선택
  const devAuthState = getDevAuthState();
  const useLocal = !isAuthenticated || devAuthState.enabled;
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

      // localStorage에 항상 저장
      localStore.addRecord(record);

      if (useLocal) return;

      // Supabase 저장
      if (!user) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("blood_levels")
          .insert({
            user_id: user.id,
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
    [user, useLocal, supabase, localStore, settings, fetchRecords]
  );

  // 기록 삭제
  const removeRecord = useCallback(
    async (id: string) => {
      localStore.removeRecord(id);

      if (useLocal) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("blood_levels")
          .delete()
          .eq("id", id);

        if (error) throw error;
        await fetchRecords();
      } catch (error) {
        console.error("[useBloodLevels] 삭제 실패:", error);
      }
    },
    [useLocal, supabase, localStore, fetchRecords]
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

  return {
    records,
    settings,
    isLoading,
    addRecord,
    removeRecord,
    updateSettings,
    getLatestRecord,
    getStatusLabel,
  };
}
