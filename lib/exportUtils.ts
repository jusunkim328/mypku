import type { NutritionData, DailyGoals } from "@/types/nutrition";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";

// --- Types ---

interface DailyMealSummary {
  date: string; // YYYY-MM-DD
  nutrition: NutritionData;
  confirmedPhe: number; // isConfirmed items only
}

interface FormulaDay {
  date: string;
  completedSlots: number;
  totalSlots: number;
}

export interface ExportData {
  /** Export period in days */
  periodDays: number;
  /** Start date of the export period (YYYY-MM-DD) */
  periodStart: string;
  /** End date of the export period (YYYY-MM-DD) */
  periodEnd: string;
  /** Meal summaries (date-sorted ascending, only days with records) */
  dailySummaries: DailyMealSummary[];
  /** Formula completion per day (may be empty if formula inactive) */
  formulaDays: FormulaDay[];
  /** Blood level records within the period */
  bloodRecords: BloodLevelRecord[];
  /** User's daily goals / allowances */
  dailyGoals: DailyGoals;
  /** Exchange unit (mg Phe per exchange, default 50) */
  phePerExchange: number;
}

// --- Helpers ---

const PHE_PER_EXCHANGE = 50;

const formatDate = (iso: string): string => {
  // YYYY-MM-DD format
  return iso.split("T")[0];
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Escape a value for CSV. Wraps in quotes if it contains commas, quotes, or newlines.
 */
const csvEscape = (value: string | number): string => {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const csvRow = (cells: (string | number)[]): string =>
  cells.map(csvEscape).join(",");

// --- CSV Generation ---

export function generateCsv(data: ExportData): string {
  const {
    periodDays = 7,
    dailySummaries,
    formulaDays,
    bloodRecords,
    dailyGoals,
    phePerExchange,
  } = data;

  const exchUnit = phePerExchange || PHE_PER_EXCHANGE;
  const lines: string[] = [];

  // --- Header ---
  const periodLabel =
    periodDays <= 7 ? `${periodDays} Day` :
    periodDays <= 30 ? "1 Month" :
    periodDays <= 90 ? "3 Month" :
    periodDays <= 180 ? "6 Month" : "1 Year";
  lines.push(csvRow([`MyPKU - ${periodLabel} Summary Report`]));
  lines.push(
    csvRow([
      "Generated",
      new Date().toISOString().split("T")[0],
    ])
  );
  lines.push(
    csvRow([
      "Period",
      `${data.periodStart} ~ ${data.periodEnd}`,
    ])
  );
  lines.push(""); // blank line

  // --- Daily Allowance ---
  lines.push(csvRow(["Daily Allowance Settings"]));
  lines.push(
    csvRow([
      "Phe Limit (mg)",
      "Exchange Limit",
      "Calories",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)",
    ])
  );
  lines.push(
    csvRow([
      dailyGoals.phenylalanine_mg,
      round1(dailyGoals.phenylalanine_mg / exchUnit),
      dailyGoals.calories,
      dailyGoals.protein_g,
      dailyGoals.carbs_g,
      dailyGoals.fat_g,
    ])
  );
  lines.push("");

  // --- Daily Nutrition ---
  lines.push(csvRow(["Daily Nutrition Summary"]));
  lines.push(
    csvRow([
      "Date",
      "Phe (mg)",
      "Phe - Confirmed Only (mg)",
      "Exchanges Used",
      "Calories",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)",
      "Formula Completed",
      "Formula Total",
    ])
  );

  for (const day of dailySummaries) {
    const formula = formulaDays.find((f) => f.date === day.date);
    lines.push(
      csvRow([
        day.date,
        round1(day.nutrition.phenylalanine_mg),
        round1(day.confirmedPhe),
        round1(day.nutrition.phenylalanine_mg / exchUnit),
        round1(day.nutrition.calories),
        round1(day.nutrition.protein_g),
        round1(day.nutrition.carbs_g),
        round1(day.nutrition.fat_g),
        formula ? formula.completedSlots : "-",
        formula ? formula.totalSlots : "-",
      ])
    );
  }
  lines.push("");

  // --- Blood Levels ---
  if (bloodRecords.length > 0) {
    lines.push(csvRow(["Blood Phe Levels"]));
    lines.push(
      csvRow([
        "Collection Date",
        "Value (umol/L)",
        "Target Min (umol/L)",
        "Target Max (umol/L)",
        "Status",
        "Notes",
      ])
    );

    for (const rec of bloodRecords) {
      const status =
        rec.normalizedUmol < rec.targetMin
          ? "Low"
          : rec.normalizedUmol > rec.targetMax
            ? "High"
            : "Normal";

      lines.push(
        csvRow([
          formatDate(rec.collectedAt),
          round1(rec.normalizedUmol),
          round1(rec.targetMin),
          round1(rec.targetMax),
          status,
          rec.notes || "",
        ])
      );
    }
    lines.push("");
  }

  // --- Footer ---
  lines.push(
    csvRow(["Disclaimer: This data is for informational purposes only and should not replace professional medical advice."])
  );

  return lines.join("\r\n");
}

// --- Download / Share ---

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csvContent: string, filename?: string): void {
  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `mypku-report-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share CSV via Web Share API (mobile).
 * Returns true if shared successfully, false if not supported or failed.
 */
export async function shareCsv(
  csvContent: string,
  filename?: string
): Promise<boolean> {
  const fname =
    filename || `mypku-report-${new Date().toISOString().split("T")[0]}.csv`;

  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const file = new File([blob], fname, { type: "text/csv" });

  const shareData = { files: [file] };
  if (!navigator.canShare(shareData)) {
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch {
    // User cancelled or share failed
    return false;
  }
}
