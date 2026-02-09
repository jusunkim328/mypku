import { describe, it, expect } from "vitest";
import { analyzeCorrelation, type CorrelationInput } from "@/lib/correlationAnalysis";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";
import type { MealRecord } from "@/types/nutrition";

const makeBloodRecord = (date: string, umol: number): BloodLevelRecord => ({
  id: `blood-${date}`,
  collectedAt: `${date}T10:00:00Z`,
  rawValue: umol,
  rawUnit: "umol",
  normalizedUmol: umol,
  targetMin: 120,
  targetMax: 360,
  notes: "",
  createdAt: `${date}T10:00:00Z`,
});

const makeMealRecord = (date: string, phe: number): MealRecord => ({
  id: `meal-${date}`,
  timestamp: `${date}T12:00:00Z`,
  mealType: "lunch",
  items: [],
  totalNutrition: {
    calories: 500,
    protein_g: 20,
    carbs_g: 60,
    fat_g: 15,
    phenylalanine_mg: phe,
  },
});

describe("analyzeCorrelation", () => {
  it("returns insufficient when N < 5", () => {
    const input: CorrelationInput = {
      bloodRecords: [
        makeBloodRecord("2025-01-10", 200),
        makeBloodRecord("2025-01-15", 300),
      ],
      mealRecords: [
        makeMealRecord("2025-01-08", 150),
        makeMealRecord("2025-01-09", 180),
        makeMealRecord("2025-01-13", 200),
        makeMealRecord("2025-01-14", 250),
      ],
    };
    const result = analyzeCorrelation(input);

    expect(result.isInsufficient).toBe(true);
    expect(result.interpretationKey).toBe("insufficient");
    expect(result.pearsonR).toBeNull();
    expect(result.regressionLine).toBeNull();
  });

  it("computes positive correlation for linearly related data", () => {
    // Create 6 blood records spaced 7 days apart so lookback windows don't overlap
    const bloodRecords: BloodLevelRecord[] = [];
    const mealRecords: MealRecord[] = [];

    for (let i = 0; i < 6; i++) {
      const bloodDay = 10 + i * 7; // day 10, 17, 24, 31, 38, 45
      const bloodMonth = bloodDay <= 31 ? 1 : 2;
      const bloodDayOfMonth = bloodDay <= 31 ? bloodDay : bloodDay - 31;
      const bloodDate = `2025-${String(bloodMonth).padStart(2, "0")}-${String(bloodDayOfMonth).padStart(2, "0")}`;
      const bloodPhe = 150 + i * 40; // 150, 190, 230, 270, 310, 350
      bloodRecords.push(makeBloodRecord(bloodDate, bloodPhe));

      // Meals in 3-day lookback window (unique to each blood record)
      for (let d = 1; d <= 3; d++) {
        const mealAbsDay = bloodDay - d;
        const mealMonth = mealAbsDay <= 31 ? 1 : 2;
        const mealDayOfMonth = mealAbsDay <= 31 ? mealAbsDay : mealAbsDay - 31;
        const mealDate = `2025-${String(mealMonth).padStart(2, "0")}-${String(mealDayOfMonth).padStart(2, "0")}`;
        const mealPhe = 100 + i * 30; // increasing with blood level
        mealRecords.push(makeMealRecord(mealDate, mealPhe));
      }
    }

    const result = analyzeCorrelation({ bloodRecords, mealRecords });

    expect(result.isInsufficient).toBe(false);
    expect(result.sampleSize).toBe(6);
    expect(result.pearsonR).not.toBeNull();
    expect(result.pearsonR!).toBeGreaterThan(0.9);
    expect(result.interpretationKey).toBe("strong_positive");
    expect(result.regressionLine).not.toBeNull();
    expect(result.regressionLine!.slope).toBeGreaterThan(0);
  });

  it("returns 'none' for uncorrelated data", () => {
    const bloodRecords: BloodLevelRecord[] = [
      makeBloodRecord("2025-01-10", 200),
      makeBloodRecord("2025-01-15", 300),
      makeBloodRecord("2025-01-20", 250),
      makeBloodRecord("2025-01-25", 180),
      makeBloodRecord("2025-01-30", 350),
    ];

    // All meals have exactly the same Phe
    const mealRecords: MealRecord[] = [];
    for (const br of bloodRecords) {
      const bloodDate = new Date(br.collectedAt);
      for (let d = 1; d <= 3; d++) {
        const mealDate = new Date(bloodDate);
        mealDate.setDate(mealDate.getDate() - d);
        mealRecords.push(
          makeMealRecord(mealDate.toISOString().split("T")[0], 200)
        );
      }
    }

    const result = analyzeCorrelation({ bloodRecords, mealRecords });

    expect(result.isInsufficient).toBe(false);
    expect(result.sampleSize).toBe(5);
    // All dietary Phe is the same → correlation should be 0 or very close
    expect(Math.abs(result.pearsonR ?? 0)).toBeLessThan(0.2);
    expect(result.interpretationKey).toBe("none");
  });

  it("skips blood records without meals in lookback window", () => {
    const input: CorrelationInput = {
      bloodRecords: [
        makeBloodRecord("2025-01-05", 200),  // no meals in lookback
        makeBloodRecord("2025-01-10", 250),
        makeBloodRecord("2025-01-15", 300),
        makeBloodRecord("2025-01-20", 350),
        makeBloodRecord("2025-01-25", 400),
        makeBloodRecord("2025-01-30", 450),
      ],
      mealRecords: [
        // No meals before Jan 5
        makeMealRecord("2025-01-08", 150),
        makeMealRecord("2025-01-09", 160),
        makeMealRecord("2025-01-13", 200),
        makeMealRecord("2025-01-14", 210),
        makeMealRecord("2025-01-18", 250),
        makeMealRecord("2025-01-19", 260),
        makeMealRecord("2025-01-23", 300),
        makeMealRecord("2025-01-24", 310),
        makeMealRecord("2025-01-28", 350),
        makeMealRecord("2025-01-29", 360),
      ],
    };
    const result = analyzeCorrelation(input);

    // Jan 5 blood record should be skipped (no meals in lookback)
    expect(result.sampleSize).toBe(5);
    expect(result.dataPoints.every((d) => d.date !== "2025-01-05")).toBe(true);
  });

  it("respects custom lookbackDays", () => {
    const input: CorrelationInput = {
      bloodRecords: [
        makeBloodRecord("2025-01-10", 200),
        makeBloodRecord("2025-01-15", 250),
        makeBloodRecord("2025-01-20", 300),
        makeBloodRecord("2025-01-25", 350),
        makeBloodRecord("2025-01-30", 400),
      ],
      mealRecords: [
        // Meals 5 days before each blood test
        makeMealRecord("2025-01-05", 100),
        makeMealRecord("2025-01-10", 150), // this is same day as blood test, should be excluded
        makeMealRecord("2025-01-15", 200),
        makeMealRecord("2025-01-20", 250),
        makeMealRecord("2025-01-25", 300),
      ],
      lookbackDays: 7,
    };
    const result = analyzeCorrelation(input);

    // With 7-day lookback, more meals should fall in window
    expect(result.sampleSize).toBeGreaterThanOrEqual(1);
  });
});
