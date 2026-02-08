import { describe, it, expect, beforeEach } from "vitest";
import { useFormulaStore } from "@/hooks/useFormulaStore";

const resetStore = () => {
  useFormulaStore.setState({
    intakes: [],
    _hasHydrated: false,
  });
};

const getTodayDateStr = (): string => {
  return new Date().toISOString().split("T")[0];
};

describe("useFormulaStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("초기 상태", () => {
    it("intakes가 빈 배열이다", () => {
      expect(useFormulaStore.getState().intakes).toEqual([]);
    });
  });

  describe("toggleSlot", () => {
    it("존재하지 않는 슬롯을 토글하면 completed=true로 생성된다", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning");

      const intakes = useFormulaStore.getState().intakes;
      expect(intakes).toHaveLength(1);
      expect(intakes[0].completed).toBe(true);
      expect(intakes[0].slot).toBe("morning");
      expect(intakes[0].date).toBe(today);
      expect(intakes[0].completedAt).not.toBeNull();
    });

    it("이미 완료된 슬롯을 토글하면 미완료로 변경된다", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning"); // true
      useFormulaStore.getState().toggleSlot(today, "morning"); // false

      const intakes = useFormulaStore.getState().intakes;
      expect(intakes).toHaveLength(1);
      expect(intakes[0].completed).toBe(false);
      expect(intakes[0].completedAt).toBeNull();
    });

    it("다시 토글하면 완료로 복원된다", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning"); // true
      useFormulaStore.getState().toggleSlot(today, "morning"); // false
      useFormulaStore.getState().toggleSlot(today, "morning"); // true

      const intake = useFormulaStore.getState().intakes[0];
      expect(intake.completed).toBe(true);
      expect(intake.completedAt).not.toBeNull();
    });
  });

  describe("isSlotCompleted", () => {
    it("존재하지 않는 슬롯은 false", () => {
      expect(useFormulaStore.getState().isSlotCompleted("2025-01-01", "morning")).toBe(false);
    });

    it("완료된 슬롯은 true", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning");
      expect(useFormulaStore.getState().isSlotCompleted(today, "morning")).toBe(true);
    });

    it("미완료된 슬롯은 false", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning"); // true
      useFormulaStore.getState().toggleSlot(today, "morning"); // false
      expect(useFormulaStore.getState().isSlotCompleted(today, "morning")).toBe(false);
    });
  });

  describe("getTodayIntakes", () => {
    it("오늘의 섭취 기록만 반환한다", () => {
      const today = getTodayDateStr();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      useFormulaStore.getState().toggleSlot(today, "morning");
      useFormulaStore.getState().toggleSlot(yesterdayStr, "morning");

      const todayIntakes = useFormulaStore.getState().getTodayIntakes();
      expect(todayIntakes).toHaveLength(1);
      expect(todayIntakes[0].date).toBe(today);
    });
  });

  describe("getIntakesByDate", () => {
    it("특정 날짜의 기록을 반환한다", () => {
      useFormulaStore.getState().toggleSlot("2025-01-15", "morning");
      useFormulaStore.getState().toggleSlot("2025-01-15", "evening");
      useFormulaStore.getState().toggleSlot("2025-01-16", "morning");

      const intakes = useFormulaStore.getState().getIntakesByDate("2025-01-15");
      expect(intakes).toHaveLength(2);
    });
  });

  describe("getCompletedCount", () => {
    it("완료된 슬롯 수를 반환한다", () => {
      const today = getTodayDateStr();
      const slots = ["morning", "noon", "evening", "bedtime"];

      useFormulaStore.getState().toggleSlot(today, "morning");
      useFormulaStore.getState().toggleSlot(today, "evening");

      const count = useFormulaStore.getState().getCompletedCount(today, slots);
      expect(count).toBe(2);
    });

    it("슬롯 목록에 없는 완료 기록은 카운트하지 않는다", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "extra-slot");

      const count = useFormulaStore.getState().getCompletedCount(today, ["morning", "evening"]);
      expect(count).toBe(0);
    });

    it("미완료 슬롯은 카운트하지 않는다", () => {
      const today = getTodayDateStr();
      useFormulaStore.getState().toggleSlot(today, "morning"); // true
      useFormulaStore.getState().toggleSlot(today, "morning"); // false (미완료)

      const count = useFormulaStore.getState().getCompletedCount(today, ["morning"]);
      expect(count).toBe(0);
    });
  });
});
