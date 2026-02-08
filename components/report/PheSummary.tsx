"use client";

import { useTranslations } from "next-intl";
import type { DailyGoals } from "@/types/nutrition";

interface DailyMealSummary {
  date: string;
  nutrition: {
    phenylalanine_mg: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confirmedPhe: number;
}

interface Props {
  dailySummaries: DailyMealSummary[];
  dailyGoals: DailyGoals;
  phePerExchange: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export default function PheSummary({
  dailySummaries,
  dailyGoals,
  phePerExchange,
}: Props) {
  const t = useTranslations("Report");

  if (dailySummaries.length === 0) return null;

  const pheValues = dailySummaries.map((d) => d.nutrition.phenylalanine_mg);
  const totalPhe = pheValues.reduce((sum, v) => sum + v, 0);
  const avgPhe = totalPhe / dailySummaries.length;
  const maxPhe = Math.max(...pheValues);
  const minPhe = Math.min(...pheValues);
  const daysOverLimit = pheValues.filter(
    (v) => v > dailyGoals.phenylalanine_mg
  ).length;
  const avgExchanges = round1(avgPhe / phePerExchange);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t("pheSummary")}
      </h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("daysTracked")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {dailySummaries.length}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("avgDaily")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {round1(avgPhe)} mg
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("maxDaily")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {round1(maxPhe)} mg
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("minDaily")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {round1(minPhe)} mg
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("daysOverLimit")}
          </p>
          <p
            className={`text-xl font-bold ${daysOverLimit > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
          >
            {daysOverLimit}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("exchangeAvg")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {avgExchanges}
          </p>
        </div>
      </div>

      {/* Daily table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-600 print:border-black">
              <th className="text-left py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                {t("date")}
              </th>
              <th className="text-right py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                Phe (mg)
              </th>
              <th className="text-right py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                Exchanges
              </th>
              <th className="text-right py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                Cal
              </th>
              <th className="text-right py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                Pro (g)
              </th>
            </tr>
          </thead>
          <tbody>
            {dailySummaries.map((day) => {
              const isOver =
                day.nutrition.phenylalanine_mg > dailyGoals.phenylalanine_mg;
              return (
                <tr
                  key={day.date}
                  className="border-b border-gray-100 dark:border-gray-800 print:border-gray-300"
                >
                  <td className="py-1.5 px-1 text-gray-700 dark:text-gray-300">
                    {day.date}
                  </td>
                  <td
                    className={`py-1.5 px-1 text-right font-medium ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
                  >
                    {round1(day.nutrition.phenylalanine_mg)}
                  </td>
                  <td className="py-1.5 px-1 text-right text-gray-700 dark:text-gray-300">
                    {round1(day.nutrition.phenylalanine_mg / phePerExchange)}
                  </td>
                  <td className="py-1.5 px-1 text-right text-gray-700 dark:text-gray-300">
                    {round1(day.nutrition.calories)}
                  </td>
                  <td className="py-1.5 px-1 text-right text-gray-700 dark:text-gray-300">
                    {round1(day.nutrition.protein_g)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
