import type { NutritionData, DailyGoals } from "@/types/nutrition";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";

// --- Input / Output types ---

export interface WeeklyInsightInput {
  weeklyPheData: { date: string; nutrition: NutritionData }[];
  formulaSummary: { date: string; completedSlots: number; totalSlots: number }[];
  dailyGoals: DailyGoals;
  bloodRecords: BloodLevelRecord[];
}

export type AnomalyType = "phe_spike" | "formula_missed_streak" | "phe_over_limit";

export interface AnomalyItem {
  type: AnomalyType;
  severity: "info" | "warning";
  date?: string;
  value?: number;
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

export interface WeeklyInsightResult {
  dataStatus: "cold_start" | "partial" | "full";
  stats: {
    avgPhe: number;
    maxPhe: number;
    minPhe: number;
    maxPheDate: string;
    goalHitDays: number;
    totalDays: number;
    formulaCompletionRate: number; // 0~1
  };
  anomalies: AnomalyItem[];
}

// --- Analysis ---

export function analyzeWeeklyInsight(input: WeeklyInsightInput): WeeklyInsightResult {
  const { weeklyPheData, formulaSummary, dailyGoals } = input;

  // Filter days that have non-zero Phe data
  const activeDays = weeklyPheData.filter(
    (d) => d.nutrition.phenylalanine_mg > 0
  );
  const totalDays = activeDays.length;

  // Determine data status
  const dataStatus: WeeklyInsightResult["dataStatus"] =
    totalDays < 3 ? "cold_start" : totalDays <= 5 ? "partial" : "full";

  // Default stats for cold start
  if (dataStatus === "cold_start") {
    return {
      dataStatus,
      stats: {
        avgPhe: 0,
        maxPhe: 0,
        minPhe: 0,
        maxPheDate: "",
        goalHitDays: 0,
        totalDays,
        formulaCompletionRate: 0,
      },
      anomalies: [],
    };
  }

  // Calculate stats
  const pheValues = activeDays.map((d) => d.nutrition.phenylalanine_mg);
  const avgPhe = Math.round(pheValues.reduce((a, b) => a + b, 0) / pheValues.length);
  const maxPhe = Math.max(...pheValues);
  const minPhe = Math.min(...pheValues);
  const maxPheDate = activeDays.find(
    (d) => d.nutrition.phenylalanine_mg === maxPhe
  )!.date;

  const pheLimit = dailyGoals.phenylalanine_mg || 300;
  const goalHitDays = activeDays.filter(
    (d) => d.nutrition.phenylalanine_mg <= pheLimit
  ).length;

  // Formula completion rate
  let formulaCompletionRate = 0;
  if (formulaSummary.length > 0) {
    const totalSlots = formulaSummary.reduce((a, s) => a + s.totalSlots, 0);
    if (totalSlots > 0) {
      const completedSlots = formulaSummary.reduce(
        (a, s) => a + s.completedSlots,
        0
      );
      formulaCompletionRate = Math.round((completedSlots / totalSlots) * 100) / 100;
    }
  }

  // Detect anomalies
  const anomalies: AnomalyItem[] = [];

  // 1. phe_spike: day-over-day >50% increase
  for (let i = 1; i < activeDays.length; i++) {
    const prev = activeDays[i - 1].nutrition.phenylalanine_mg;
    const curr = activeDays[i].nutrition.phenylalanine_mg;
    if (prev > 0 && curr > prev * 1.5) {
      anomalies.push({
        type: "phe_spike",
        severity: "warning",
        date: activeDays[i].date,
        value: curr,
        messageKey: "pheSpike",
        messageParams: {
          date: activeDays[i].date,
          value: curr,
          increase: Math.round(((curr - prev) / prev) * 100),
        },
      });
    }
  }

  // 2. formula_missed_streak: 2+ consecutive days with completedSlots === 0
  let missedStreak = 0;
  let streakStartDate = "";
  for (const s of formulaSummary) {
    if (s.totalSlots > 0 && s.completedSlots === 0) {
      if (missedStreak === 0) streakStartDate = s.date;
      missedStreak++;
    } else {
      if (missedStreak >= 2) {
        anomalies.push({
          type: "formula_missed_streak",
          severity: "warning",
          date: streakStartDate,
          value: missedStreak,
          messageKey: "formulaMissedStreak",
          messageParams: { days: missedStreak, startDate: streakStartDate },
        });
      }
      missedStreak = 0;
    }
  }
  // Check trailing streak
  if (missedStreak >= 2) {
    anomalies.push({
      type: "formula_missed_streak",
      severity: "warning",
      date: streakStartDate,
      value: missedStreak,
      messageKey: "formulaMissedStreak",
      messageParams: { days: missedStreak, startDate: streakStartDate },
    });
  }

  // 3. phe_over_limit: any day where Phe exceeds goal
  for (const day of activeDays) {
    if (day.nutrition.phenylalanine_mg > pheLimit) {
      anomalies.push({
        type: "phe_over_limit",
        severity: "info",
        date: day.date,
        value: day.nutrition.phenylalanine_mg,
        messageKey: "pheOverLimit",
        messageParams: {
          date: day.date,
          value: day.nutrition.phenylalanine_mg,
          limit: pheLimit,
        },
      });
    }
  }

  return {
    dataStatus,
    stats: {
      avgPhe,
      maxPhe,
      minPhe,
      maxPheDate,
      goalHitDays,
      totalDays,
      formulaCompletionRate,
    },
    anomalies,
  };
}
