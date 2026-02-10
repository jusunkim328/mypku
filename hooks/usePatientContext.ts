"use client";

import { create } from "zustand";

interface PatientInfo {
  id: string;
  name: string | null;
  email: string;
}

interface PatientContextState {
  /** 현재 보고 있는 환자 정보 (null이면 자기 데이터) */
  activePatient: PatientInfo | null;
  /** 현재 환자에 대한 권한 */
  permissions: string[];

  setActivePatient: (patient: PatientInfo, permissions: string[]) => void;
  clearActivePatient: () => void;
}

export const usePatientContext = create<PatientContextState>((set) => ({
  activePatient: null,
  permissions: [],

  setActivePatient: (patient, permissions) =>
    set({ activePatient: patient, permissions }),

  clearActivePatient: () =>
    set({ activePatient: null, permissions: [] }),
}));

// --- 편의 selector 함수들 ---

/** 데이터 조회/입력 시 사용할 user ID (환자 or 자기 자신) */
export function useTargetUserId(myUserId: string | undefined): string | undefined {
  const activePatient = usePatientContext((s) => s.activePatient);
  return activePatient?.id ?? myUserId;
}

/** 보호자 모드에서 편집 가능 여부 */
export function useCanEdit(): boolean {
  const activePatient = usePatientContext((s) => s.activePatient);
  const permissions = usePatientContext((s) => s.permissions);
  // 자기 데이터이면 항상 편집 가능
  if (!activePatient) return true;
  return permissions.includes("edit");
}

/** 자기 데이터를 보고 있는지 여부 */
export function useIsViewingOwnData(): boolean {
  const activePatient = usePatientContext((s) => s.activePatient);
  return !activePatient;
}

/** 보호자 모드 활성 여부 (= !isViewingOwnData) */
export function useIsCaregiverMode(): boolean {
  const activePatient = usePatientContext((s) => s.activePatient);
  return !!activePatient;
}
