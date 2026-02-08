import type { ExportData } from "@/lib/exportUtils";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";

const DEFAULT_PHE_PER_EXCHANGE = 50;

type ExportPeriod = 7 | 30 | 90 | 180 | 365;

interface BuildReportDataParams {
  days: ExportPeriod;
  mealRecords: Array<{
    timestamp: string;
    totalNutrition: {
      phenylalanine_mg: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    items: Array<{
      isConfirmed?: boolean;
      nutrition: { phenylalanine_mg: number };
    }>;
  }>;
  fetchFormulaSummary: (
    dates: string[]
  ) => Promise<
    Array<{
      date: string;
      completedSlots: number;
      totalSlots: number;
    }>
  >;
  bloodRecords: BloodLevelRecord[];
  dailyGoals: {
    phenylalanine_mg: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  phePerExchange?: number;
}

export async function buildReportData(
  params: BuildReportDataParams
): Promise<ExportData> {
  const { days, mealRecords, fetchFormulaSummary, bloodRecords, dailyGoals, phePerExchange } =
    params;

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Group meals by date
  const filteredMeals = mealRecords.filter(
    (r) => new Date(r.timestamp) >= startDate
  );

  const byDate: Record<
    string,
    {
      phe: number;
      confirmedPhe: number;
      cal: number;
      pro: number;
      carb: number;
      fat: number;
    }
  > = {};

  for (const meal of filteredMeals) {
    const dateStr = new Date(meal.timestamp).toISOString().split("T")[0];
    if (!byDate[dateStr]) {
      byDate[dateStr] = {
        phe: 0,
        confirmedPhe: 0,
        cal: 0,
        pro: 0,
        carb: 0,
        fat: 0,
      };
    }
    const d = byDate[dateStr];
    d.phe += meal.totalNutrition.phenylalanine_mg;
    d.cal += meal.totalNutrition.calories;
    d.pro += meal.totalNutrition.protein_g;
    d.carb += meal.totalNutrition.carbs_g;
    d.fat += meal.totalNutrition.fat_g;

    for (const item of meal.items) {
      if (item.isConfirmed) {
        d.confirmedPhe += item.nutrition.phenylalanine_mg;
      }
    }
  }

  // Formula
  const allFormulaDays = await fetchFormulaSummary(dates);
  const formulaMap = new Map(
    allFormulaDays
      .filter((f) => f.completedSlots > 0)
      .map((f) => [f.date, f] as const)
  );

  // Only include days with meal records or formula completion
  const recordedDateSet = new Set<string>();
  for (const date of Object.keys(byDate)) recordedDateSet.add(date);
  for (const date of formulaMap.keys()) recordedDateSet.add(date);
  const recordedDates = dates.filter((date) => recordedDateSet.has(date));

  const dailySummaries = recordedDates.map((date) => {
    const d = byDate[date];
    return {
      date,
      nutrition: {
        phenylalanine_mg: d?.phe ?? 0,
        calories: d?.cal ?? 0,
        protein_g: d?.pro ?? 0,
        carbs_g: d?.carb ?? 0,
        fat_g: d?.fat ?? 0,
      },
      confirmedPhe: d?.confirmedPhe ?? 0,
    };
  });

  const defaultFormula = {
    completedSlots: 0,
    totalSlots: allFormulaDays[0]?.totalSlots ?? 0,
  };
  const formulaDays = recordedDates.map(
    (date) => formulaMap.get(date) ?? { date, ...defaultFormula }
  );

  // Blood records within period
  const filteredBlood = bloodRecords.filter(
    (r) => new Date(r.collectedAt) >= startDate
  );

  return {
    periodDays: days,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    dailySummaries,
    formulaDays,
    bloodRecords: filteredBlood,
    dailyGoals,
    phePerExchange: phePerExchange || DEFAULT_PHE_PER_EXCHANGE,
  } as ExportData;
}
