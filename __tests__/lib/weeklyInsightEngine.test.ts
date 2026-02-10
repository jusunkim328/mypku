import { describe, it, expect } from "vitest";
import { analyzeWeeklyInsight, type WeeklyInsightInput } from "@/lib/weeklyInsightEngine";
import type { NutritionData, DailyGoals } from "@/types/nutrition";

const makeNutrition = (phe: number): NutritionData => ({
  calories: 2000,
  protein_g: 50,
  carbs_g: 250,
  fat_g: 65,
  phenylalanine_mg: phe,
});

const defaultGoals: DailyGoals = {
  calories: 2000,
  protein_g: 50,
  carbs_g: 250,
  fat_g: 65,
  phenylalanine_mg: 300,
};

const makeDay = (date: string, phe: number) => ({
  date,
  nutrition: makeNutrition(phe),
});

const makeFormula = (date: string, completed: number, total: number) => ({
  date,
  completedSlots: completed,
  totalSlots: total,
});

describe("analyzeWeeklyInsight", () => {
  it("returns cold_start for 0 days of data", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    expect(result.dataStatus).toBe("cold_start");
    expect(result.stats.totalDays).toBe(0);
    expect(result.anomalies).toHaveLength(0);
  });

  it("returns cold_start for 2 days of data", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [makeDay("2025-01-06", 200), makeDay("2025-01-07", 250)],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    expect(result.dataStatus).toBe("cold_start");
    expect(result.stats.totalDays).toBe(2);
  });

  it("returns partial for 3–5 days of data", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-05", 200),
        makeDay("2025-01-06", 250),
        makeDay("2025-01-07", 280),
      ],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    expect(result.dataStatus).toBe("partial");
    expect(result.stats.totalDays).toBe(3);
  });

  it("returns full for 7 days of normal data with correct stats", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 220),
        makeDay("2025-01-03", 180),
        makeDay("2025-01-04", 250),
        makeDay("2025-01-05", 270),
        makeDay("2025-01-06", 210),
        makeDay("2025-01-07", 190),
      ],
      formulaSummary: [
        makeFormula("2025-01-01", 3, 3),
        makeFormula("2025-01-02", 3, 3),
        makeFormula("2025-01-03", 2, 3),
        makeFormula("2025-01-04", 3, 3),
        makeFormula("2025-01-05", 3, 3),
        makeFormula("2025-01-06", 3, 3),
        makeFormula("2025-01-07", 3, 3),
      ],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);

    expect(result.dataStatus).toBe("full");
    expect(result.stats.totalDays).toBe(7);
    expect(result.stats.avgPhe).toBe(Math.round((200 + 220 + 180 + 250 + 270 + 210 + 190) / 7));
    expect(result.stats.maxPhe).toBe(270);
    expect(result.stats.minPhe).toBe(180);
    expect(result.stats.maxPheDate).toBe("2025-01-05");
    expect(result.stats.goalHitDays).toBe(7); // all under 300
    expect(result.stats.formulaCompletionRate).toBeCloseTo(20 / 21, 2);
    expect(result.anomalies).toHaveLength(0);
  });

  it("detects phe_spike (>50% increase day-over-day)", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 100),
        makeDay("2025-01-02", 100),
        makeDay("2025-01-03", 200), // 100% increase → spike
        makeDay("2025-01-04", 150),
        makeDay("2025-01-05", 100),
        makeDay("2025-01-06", 100),
      ],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);

    const spikes = result.anomalies.filter((a) => a.type === "phe_spike");
    expect(spikes.length).toBeGreaterThanOrEqual(1);
    expect(spikes[0].date).toBe("2025-01-03");
    expect(spikes[0].severity).toBe("warning");
  });

  it("does NOT detect phe_spike at exactly 50% increase", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 300), // exactly 50% → NOT a spike (> not >=)
        makeDay("2025-01-03", 200),
      ],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    const spikes = result.anomalies.filter((a) => a.type === "phe_spike");
    expect(spikes).toHaveLength(0);
  });

  it("detects formula_missed_streak (2+ consecutive days)", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 200),
        makeDay("2025-01-03", 200),
      ],
      formulaSummary: [
        makeFormula("2025-01-01", 3, 3),
        makeFormula("2025-01-02", 0, 3), // missed
        makeFormula("2025-01-03", 0, 3), // missed (streak of 2)
      ],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);

    const missed = result.anomalies.filter((a) => a.type === "formula_missed_streak");
    expect(missed).toHaveLength(1);
    expect(missed[0].value).toBe(2);
    expect(missed[0].severity).toBe("warning");
  });

  it("does NOT detect formula_missed_streak for exactly 1 day", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 200),
        makeDay("2025-01-03", 200),
      ],
      formulaSummary: [
        makeFormula("2025-01-01", 3, 3),
        makeFormula("2025-01-02", 0, 3), // missed 1 day only
        makeFormula("2025-01-03", 3, 3),
      ],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    const missed = result.anomalies.filter((a) => a.type === "formula_missed_streak");
    expect(missed).toHaveLength(0);
  });

  it("detects phe_over_limit", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 350), // over 300 limit
        makeDay("2025-01-03", 200),
      ],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);

    const overLimit = result.anomalies.filter((a) => a.type === "phe_over_limit");
    expect(overLimit).toHaveLength(1);
    expect(overLimit[0].date).toBe("2025-01-02");
    expect(overLimit[0].value).toBe(350);
    expect(overLimit[0].severity).toBe("info");
  });

  it("ignores days with 0 Phe (no data logged)", () => {
    const input: WeeklyInsightInput = {
      weeklyPheData: [
        makeDay("2025-01-01", 200),
        makeDay("2025-01-02", 0), // no data
        makeDay("2025-01-03", 0), // no data
        makeDay("2025-01-04", 250),
        makeDay("2025-01-05", 220),
      ],
      formulaSummary: [],
      dailyGoals: defaultGoals,
      bloodRecords: [],
    };
    const result = analyzeWeeklyInsight(input);
    // Only 3 active days → partial
    expect(result.dataStatus).toBe("partial");
    expect(result.stats.totalDays).toBe(3);
  });
});
