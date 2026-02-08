import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  usePatientContext,
  useTargetUserId,
  useCanEdit,
  useIsCaregiverMode,
  useIsViewingOwnData,
} from "@/hooks/usePatientContext";

const resetStore = () => {
  usePatientContext.setState({
    activePatient: null,
    permissions: [],
  });
};

describe("usePatientContext", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("초기 상태", () => {
    it("activePatient이 null이다", () => {
      expect(usePatientContext.getState().activePatient).toBeNull();
    });

    it("permissions이 빈 배열이다", () => {
      expect(usePatientContext.getState().permissions).toEqual([]);
    });
  });

  describe("setActivePatient", () => {
    it("환자와 권한을 설정할 수 있다", () => {
      const patient = { id: "patient-1", name: "Test Patient", email: "test@example.com" };
      usePatientContext.getState().setActivePatient(patient, ["view", "edit"]);

      const state = usePatientContext.getState();
      expect(state.activePatient).toEqual(patient);
      expect(state.permissions).toEqual(["view", "edit"]);
    });
  });

  describe("clearActivePatient", () => {
    it("환자 정보와 권한을 초기화한다", () => {
      const patient = { id: "patient-1", name: "Test Patient", email: "test@example.com" };
      usePatientContext.getState().setActivePatient(patient, ["view"]);
      usePatientContext.getState().clearActivePatient();

      const state = usePatientContext.getState();
      expect(state.activePatient).toBeNull();
      expect(state.permissions).toEqual([]);
    });
  });

  describe("useTargetUserId", () => {
    it("환자가 없으면 자기 ID를 반환한다", () => {
      const { result } = renderHook(() => useTargetUserId("my-id"));
      expect(result.current).toBe("my-id");
    });

    it("환자가 있으면 환자 ID를 반환한다", () => {
      usePatientContext.getState().setActivePatient(
        { id: "patient-1", name: "Patient", email: "p@test.com" },
        ["view"]
      );

      const { result } = renderHook(() => useTargetUserId("my-id"));
      expect(result.current).toBe("patient-1");
    });

    it("myUserId가 undefined이고 환자도 없으면 undefined를 반환한다", () => {
      const { result } = renderHook(() => useTargetUserId(undefined));
      expect(result.current).toBeUndefined();
    });
  });

  describe("useCanEdit", () => {
    it("자기 데이터를 볼 때는 항상 true", () => {
      const { result } = renderHook(() => useCanEdit());
      expect(result.current).toBe(true);
    });

    it("환자 데이터를 볼 때 edit 권한이 있으면 true", () => {
      usePatientContext.getState().setActivePatient(
        { id: "patient-1", name: "Patient", email: "p@test.com" },
        ["view", "edit"]
      );

      const { result } = renderHook(() => useCanEdit());
      expect(result.current).toBe(true);
    });

    it("환자 데이터를 볼 때 edit 권한이 없으면 false", () => {
      usePatientContext.getState().setActivePatient(
        { id: "patient-1", name: "Patient", email: "p@test.com" },
        ["view"]
      );

      const { result } = renderHook(() => useCanEdit());
      expect(result.current).toBe(false);
    });
  });

  describe("useIsCaregiverMode", () => {
    it("환자가 없으면 false", () => {
      const { result } = renderHook(() => useIsCaregiverMode());
      expect(result.current).toBe(false);
    });

    it("환자가 있으면 true", () => {
      usePatientContext.getState().setActivePatient(
        { id: "patient-1", name: "Patient", email: "p@test.com" },
        ["view"]
      );

      const { result } = renderHook(() => useIsCaregiverMode());
      expect(result.current).toBe(true);
    });
  });

  describe("useIsViewingOwnData", () => {
    it("환자가 없으면 true", () => {
      const { result } = renderHook(() => useIsViewingOwnData());
      expect(result.current).toBe(true);
    });

    it("환자가 있으면 false", () => {
      usePatientContext.getState().setActivePatient(
        { id: "patient-1", name: "Patient", email: "p@test.com" },
        ["view"]
      );

      const { result } = renderHook(() => useIsViewingOwnData());
      expect(result.current).toBe(false);
    });
  });
});
