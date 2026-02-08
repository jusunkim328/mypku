import { describe, it, expect, beforeEach } from "vitest";
import {
  useBloodLevelStore,
  mgDlToUmol,
  umolToMgDl,
} from "@/hooks/useBloodLevels";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";

const resetStore = () => {
  useBloodLevelStore.setState({
    records: [],
    settings: {
      unit: "umol",
      targetMin: 120,
      targetMax: 360,
    },
    _hasHydrated: false,
  });
};

const makeBloodRecord = (overrides: Partial<BloodLevelRecord> = {}): BloodLevelRecord => ({
  id: `blood-${Math.random().toString(36).slice(2)}`,
  collectedAt: new Date().toISOString(),
  rawValue: 240,
  rawUnit: "umol",
  normalizedUmol: 240,
  targetMin: 120,
  targetMax: 360,
  notes: "",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("Blood Level 단위 변환", () => {
  it("mg/dL → µmol/L 변환", () => {
    // 1 mg/dL = 60.54 µmol/L
    expect(mgDlToUmol(1)).toBe(60.5);
    expect(mgDlToUmol(2)).toBe(121.1);
    expect(mgDlToUmol(0)).toBe(0);
  });

  it("µmol/L → mg/dL 변환", () => {
    expect(umolToMgDl(60.54)).toBe(1);
    expect(umolToMgDl(121.08)).toBe(2);
    expect(umolToMgDl(0)).toBe(0);
  });

  it("양방향 변환의 근사적 일관성", () => {
    const original = 5;
    const converted = mgDlToUmol(original);
    const backConverted = umolToMgDl(converted);
    // 반올림 오차가 있을 수 있으므로 0.1 이내 검증
    expect(Math.abs(backConverted - original)).toBeLessThan(0.1);
  });
});

describe("useBloodLevelStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("초기 상태", () => {
    it("records가 빈 배열이다", () => {
      expect(useBloodLevelStore.getState().records).toEqual([]);
    });

    it("기본 settings 값이 올바르다", () => {
      const settings = useBloodLevelStore.getState().settings;
      expect(settings.unit).toBe("umol");
      expect(settings.targetMin).toBe(120);
      expect(settings.targetMax).toBe(360);
    });
  });

  describe("addRecord", () => {
    it("기록을 추가할 수 있다", () => {
      const record = makeBloodRecord({ id: "test-1" });
      useBloodLevelStore.getState().addRecord(record);

      const records = useBloodLevelStore.getState().records;
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("test-1");
    });

    it("기록이 collectedAt 기준 내림차순으로 정렬된다", () => {
      const older = makeBloodRecord({
        id: "older",
        collectedAt: "2025-01-01T10:00:00Z",
      });
      const newer = makeBloodRecord({
        id: "newer",
        collectedAt: "2025-01-15T10:00:00Z",
      });

      useBloodLevelStore.getState().addRecord(older);
      useBloodLevelStore.getState().addRecord(newer);

      const records = useBloodLevelStore.getState().records;
      expect(records[0].id).toBe("newer");
      expect(records[1].id).toBe("older");
    });
  });

  describe("removeRecord", () => {
    it("기록을 삭제할 수 있다", () => {
      const record = makeBloodRecord({ id: "to-delete" });
      useBloodLevelStore.getState().addRecord(record);
      expect(useBloodLevelStore.getState().records).toHaveLength(1);

      useBloodLevelStore.getState().removeRecord("to-delete");
      expect(useBloodLevelStore.getState().records).toHaveLength(0);
    });
  });

  describe("setSettings", () => {
    it("설정을 부분적으로 업데이트할 수 있다", () => {
      useBloodLevelStore.getState().setSettings({ unit: "mg_dl" });

      const settings = useBloodLevelStore.getState().settings;
      expect(settings.unit).toBe("mg_dl");
      expect(settings.targetMin).toBe(120); // 기존 값 유지
      expect(settings.targetMax).toBe(360);
    });

    it("targetMin/Max를 업데이트할 수 있다", () => {
      useBloodLevelStore.getState().setSettings({ targetMin: 100, targetMax: 400 });

      const settings = useBloodLevelStore.getState().settings;
      expect(settings.targetMin).toBe(100);
      expect(settings.targetMax).toBe(400);
    });
  });
});
