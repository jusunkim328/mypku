import { describe, it, expect } from "vitest";
import {
  PKU_CONFIDENCE,
  PKU_PHE_DEFAULTS,
  PKU_EXCHANGE,
  PKU_SAFETY_THRESHOLDS,
  PKU_BLOOD_TARGETS,
  PKU_UNIT_CONVERSION,
} from "@/lib/constants/pku";

describe("PKU Constants", () => {
  describe("PKU_CONFIDENCE", () => {
    it("신뢰도 임계값 순서가 올바르다", () => {
      expect(PKU_CONFIDENCE.VERY_LOW).toBeLessThan(PKU_CONFIDENCE.LOW);
      expect(PKU_CONFIDENCE.LOW).toBeLessThan(PKU_CONFIDENCE.MEDIUM);
      expect(PKU_CONFIDENCE.MEDIUM).toBeLessThan(PKU_CONFIDENCE.HIGH);
    });

    it("값이 0~1 사이이다", () => {
      expect(PKU_CONFIDENCE.VERY_LOW).toBeGreaterThan(0);
      expect(PKU_CONFIDENCE.HIGH).toBeLessThanOrEqual(1);
    });

    it("구체적인 값이 올바르다", () => {
      expect(PKU_CONFIDENCE.VERY_LOW).toBe(0.3);
      expect(PKU_CONFIDENCE.LOW).toBe(0.5);
      expect(PKU_CONFIDENCE.MEDIUM).toBe(0.7);
      expect(PKU_CONFIDENCE.HIGH).toBe(0.8);
    });
  });

  describe("PKU_PHE_DEFAULTS", () => {
    it("연령대별 기본값 순서가 올바르다", () => {
      expect(PKU_PHE_DEFAULTS.INFANT).toBeLessThanOrEqual(PKU_PHE_DEFAULTS.CHILD);
      expect(PKU_PHE_DEFAULTS.CHILD).toBeLessThanOrEqual(PKU_PHE_DEFAULTS.ADULT);
    });

    it("구체적인 값이 올바르다", () => {
      expect(PKU_PHE_DEFAULTS.INFANT).toBe(200);
      expect(PKU_PHE_DEFAULTS.CHILD).toBe(300);
      expect(PKU_PHE_DEFAULTS.ADULT).toBe(400);
      expect(PKU_PHE_DEFAULTS.DEFAULT).toBe(300);
    });

    it("DEFAULT는 CHILD와 동일하다", () => {
      expect(PKU_PHE_DEFAULTS.DEFAULT).toBe(PKU_PHE_DEFAULTS.CHILD);
    });
  });

  describe("PKU_EXCHANGE", () => {
    it("표준 Exchange 단위는 50mg", () => {
      expect(PKU_EXCHANGE.STANDARD).toBe(50);
    });

    it("정밀 Exchange 단위는 15mg", () => {
      expect(PKU_EXCHANGE.DETAILED).toBe(15);
    });

    it("STANDARD가 DETAILED보다 크다", () => {
      expect(PKU_EXCHANGE.STANDARD).toBeGreaterThan(PKU_EXCHANGE.DETAILED);
    });
  });

  describe("PKU_SAFETY_THRESHOLDS", () => {
    it("Safe 최대치가 Caution 최대치보다 작다", () => {
      expect(PKU_SAFETY_THRESHOLDS.SAFE_MAX).toBeLessThan(PKU_SAFETY_THRESHOLDS.CAUTION_MAX);
    });

    it("구체적인 값이 올바르다", () => {
      expect(PKU_SAFETY_THRESHOLDS.SAFE_MAX).toBe(20);
      expect(PKU_SAFETY_THRESHOLDS.CAUTION_MAX).toBe(100);
    });
  });

  describe("PKU_BLOOD_TARGETS", () => {
    it("MIN이 MAX보다 작다", () => {
      expect(PKU_BLOOD_TARGETS.MIN).toBeLessThan(PKU_BLOOD_TARGETS.MAX);
    });

    it("구체적인 값이 올바르다 (µmol/L)", () => {
      expect(PKU_BLOOD_TARGETS.MIN).toBe(120);
      expect(PKU_BLOOD_TARGETS.MAX).toBe(360);
    });
  });

  describe("PKU_UNIT_CONVERSION", () => {
    it("mg/dL → µmol/L 변환 계수가 60.54이다", () => {
      expect(PKU_UNIT_CONVERSION.MG_DL_TO_UMOL_L).toBe(60.54);
    });
  });
});
