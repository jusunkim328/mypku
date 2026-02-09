import type { BloodLevelRecord } from "@/hooks/useBloodLevels";
import type { MealRecord } from "@/types/nutrition";

// --- Types ---

export interface CorrelationInput {
  bloodRecords: BloodLevelRecord[];
  mealRecords: MealRecord[];
  lookbackDays?: number; // default 3
}

export interface CorrelationResult {
  dataPoints: { dietaryPhe: number; bloodPhe: number; date: string }[];
  sampleSize: number;
  isInsufficient: boolean; // N < 5
  pearsonR: number | null;
  regressionLine: { slope: number; intercept: number } | null;
  interpretationKey: string;
}

// --- Analysis ---

export function analyzeCorrelation(input: CorrelationInput): CorrelationResult {
  const { bloodRecords, mealRecords, lookbackDays = 3 } = input;

  // Build data points: for each blood record, compute average dietary Phe
  // over the preceding `lookbackDays` days
  const dataPoints: CorrelationResult["dataPoints"] = [];

  for (const br of bloodRecords) {
    const bloodDate = new Date(br.collectedAt);
    bloodDate.setHours(0, 0, 0, 0);

    // Lookback window: [bloodDate - lookbackDays, bloodDate)
    const windowStart = new Date(bloodDate);
    windowStart.setDate(windowStart.getDate() - lookbackDays);

    const mealsInWindow = mealRecords.filter((m) => {
      const mealDate = new Date(m.timestamp);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate >= windowStart && mealDate < bloodDate;
    });

    if (mealsInWindow.length === 0) continue;

    // Sum Phe across all meals, then average per day
    const totalPhe = mealsInWindow.reduce(
      (sum, m) => sum + (m.totalNutrition?.phenylalanine_mg ?? 0),
      0
    );

    // Count distinct days with meals in the window
    const distinctDays = new Set(
      mealsInWindow.map((m) => new Date(m.timestamp).toISOString().split("T")[0])
    ).size;

    const avgDailyPhe = Math.round(totalPhe / distinctDays);

    dataPoints.push({
      dietaryPhe: avgDailyPhe,
      bloodPhe: br.normalizedUmol,
      date: bloodDate.toISOString().split("T")[0],
    });
  }

  const sampleSize = dataPoints.length;
  const isInsufficient = sampleSize < 5;

  if (isInsufficient) {
    return {
      dataPoints,
      sampleSize,
      isInsufficient,
      pearsonR: null,
      regressionLine: null,
      interpretationKey: "insufficient",
    };
  }

  // Compute Pearson correlation coefficient
  const xs = dataPoints.map((d) => d.dietaryPhe);
  const ys = dataPoints.map((d) => d.bloodPhe);

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = ys.reduce((sum, y) => sum + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  let pearsonR: number | null = null;
  if (denominator !== 0) {
    pearsonR = Math.round((numerator / denominator) * 1000) / 1000;
  } else {
    pearsonR = 0;
  }

  // Linear regression: y = slope * x + intercept
  const slopeDenom = n * sumX2 - sumX * sumX;
  let slope = 0;
  let intercept = 0;
  if (slopeDenom !== 0) {
    slope = Math.round((numerator / slopeDenom) * 1000) / 1000;
    intercept = Math.round(((sumY - slope * sumX) / n) * 1000) / 1000;
  }

  // Interpret correlation strength
  const absR = Math.abs(pearsonR ?? 0);
  let interpretationKey: string;
  if (absR >= 0.7) {
    interpretationKey = pearsonR! >= 0 ? "strong_positive" : "strong_negative";
  } else if (absR >= 0.4) {
    interpretationKey = "moderate";
  } else if (absR >= 0.2) {
    interpretationKey = "weak";
  } else {
    interpretationKey = "none";
  }

  return {
    dataPoints,
    sampleSize,
    isInsufficient,
    pearsonR,
    regressionLine: { slope, intercept },
    interpretationKey,
  };
}
