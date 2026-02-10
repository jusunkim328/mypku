import { describe, it, expect } from "vitest";
import { generateCsv } from "@/lib/exportUtils";
import type { ExportData } from "@/lib/exportUtils";

const makeExportData = (overrides: Partial<ExportData> = {}): ExportData => ({
  periodDays: 7,
  periodStart: "2025-01-08",
  periodEnd: "2025-01-14",
  dailySummaries: [],
  formulaDays: [],
  bloodRecords: [],
  dailyGoals: {
    calories: 2000,
    protein_g: 50,
    carbs_g: 250,
    fat_g: 65,
    phenylalanine_mg: 300,
  },
  phePerExchange: 50,
  ...overrides,
});

describe("generateCsv", () => {
  it("CSV 문자열을 생성한다", () => {
    const csv = generateCsv(makeExportData());
    expect(typeof csv).toBe("string");
    expect(csv.length).toBeGreaterThan(0);
  });

  it("헤더에 기간 정보가 포함된다", () => {
    const csv = generateCsv(makeExportData({ periodDays: 7 }));
    expect(csv).toContain("7 Day Summary Report");
  });

  it("1개월 기간 레이블", () => {
    const csv = generateCsv(makeExportData({ periodDays: 30 }));
    expect(csv).toContain("1 Month Summary Report");
  });

  it("3개월 기간 레이블", () => {
    const csv = generateCsv(makeExportData({ periodDays: 90 }));
    expect(csv).toContain("3 Month Summary Report");
  });

  it("6개월 기간 레이블", () => {
    const csv = generateCsv(makeExportData({ periodDays: 180 }));
    expect(csv).toContain("6 Month Summary Report");
  });

  it("1년 기간 레이블", () => {
    const csv = generateCsv(makeExportData({ periodDays: 365 }));
    expect(csv).toContain("1 Year Summary Report");
  });

  it("일일 허용량 설정이 포함된다", () => {
    const csv = generateCsv(makeExportData());
    expect(csv).toContain("Daily Allowance Settings");
    expect(csv).toContain("Phe Limit (mg)");
  });

  it("일일 영양소 요약 섹션이 포함된다", () => {
    const csv = generateCsv(makeExportData());
    expect(csv).toContain("Daily Nutrition Summary");
  });

  it("식사 기록이 있으면 일일 데이터에 포함된다", () => {
    const csv = generateCsv(
      makeExportData({
        dailySummaries: [
          {
            date: "2025-01-10",
            nutrition: {
              calories: 1500,
              protein_g: 30,
              carbs_g: 200,
              fat_g: 50,
              phenylalanine_mg: 250,
            },
            confirmedPhe: 200,
          },
        ],
      })
    );
    expect(csv).toContain("2025-01-10");
    expect(csv).toContain("1500");
    expect(csv).toContain("250");
  });

  it("혈중 기록이 있으면 Blood Phe Levels 섹션이 포함된다", () => {
    const csv = generateCsv(
      makeExportData({
        bloodRecords: [
          {
            id: "blood-1",
            collectedAt: "2025-01-12T10:00:00Z",
            rawValue: 4,
            rawUnit: "mg_dl",
            normalizedUmol: 242.2,
            targetMin: 120,
            targetMax: 360,
            notes: "routine check",
            createdAt: "2025-01-12T10:00:00Z",
          },
        ],
      })
    );
    expect(csv).toContain("Blood Phe Levels");
    expect(csv).toContain("2025-01-12");
    expect(csv).toContain("Normal");
    expect(csv).toContain("routine check");
  });

  it("혈중 기록의 status가 올바르게 판정된다", () => {
    // Low
    const csvLow = generateCsv(
      makeExportData({
        bloodRecords: [
          {
            id: "low",
            collectedAt: "2025-01-12T10:00:00Z",
            rawValue: 1,
            rawUnit: "mg_dl",
            normalizedUmol: 50,
            targetMin: 120,
            targetMax: 360,
            notes: "",
            createdAt: "2025-01-12T10:00:00Z",
          },
        ],
      })
    );
    expect(csvLow).toContain("Low");

    // High
    const csvHigh = generateCsv(
      makeExportData({
        bloodRecords: [
          {
            id: "high",
            collectedAt: "2025-01-12T10:00:00Z",
            rawValue: 10,
            rawUnit: "mg_dl",
            normalizedUmol: 500,
            targetMin: 120,
            targetMax: 360,
            notes: "",
            createdAt: "2025-01-12T10:00:00Z",
          },
        ],
      })
    );
    expect(csvHigh).toContain("High");
  });

  it("혈중 기록이 없으면 Blood Phe Levels 섹션이 없다", () => {
    const csv = generateCsv(makeExportData({ bloodRecords: [] }));
    expect(csv).not.toContain("Blood Phe Levels");
  });

  it("포뮬러 데이터가 포함된다", () => {
    const csv = generateCsv(
      makeExportData({
        dailySummaries: [
          {
            date: "2025-01-10",
            nutrition: {
              calories: 1500,
              protein_g: 30,
              carbs_g: 200,
              fat_g: 50,
              phenylalanine_mg: 250,
            },
            confirmedPhe: 200,
          },
        ],
        formulaDays: [
          { date: "2025-01-10", completedSlots: 3, totalSlots: 4 },
        ],
      })
    );
    expect(csv).toContain("Formula Completed");
  });

  it("면책 조항이 포함된다", () => {
    const csv = generateCsv(makeExportData());
    expect(csv).toContain("Disclaimer");
    expect(csv).toContain("informational purposes only");
  });

  it("CRLF 줄바꿈을 사용한다", () => {
    const csv = generateCsv(makeExportData());
    expect(csv).toContain("\r\n");
  });

  it("CSV escape: 쉼표가 포함된 노트를 올바르게 처리한다", () => {
    const csv = generateCsv(
      makeExportData({
        bloodRecords: [
          {
            id: "escape-test",
            collectedAt: "2025-01-12T10:00:00Z",
            rawValue: 4,
            rawUnit: "mg_dl",
            normalizedUmol: 242.2,
            targetMin: 120,
            targetMax: 360,
            notes: "test, with comma",
            createdAt: "2025-01-12T10:00:00Z",
          },
        ],
      })
    );
    expect(csv).toContain('"test, with comma"');
  });
});
