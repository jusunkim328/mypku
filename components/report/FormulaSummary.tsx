"use client";

import { useTranslations } from "next-intl";

interface FormulaDay {
  date: string;
  completedSlots: number;
  totalSlots: number;
}

interface Props {
  formulaDays: FormulaDay[];
}

export default function FormulaSummary({ formulaDays }: Props) {
  const t = useTranslations("Report");

  if (formulaDays.length === 0) return null;

  const daysWithSlots = formulaDays.filter((d) => d.totalSlots > 0);
  const avgCompletion =
    daysWithSlots.length > 0
      ? Math.round(
          (daysWithSlots.reduce(
            (sum, d) => sum + d.completedSlots / d.totalSlots,
            0
          ) /
            daysWithSlots.length) *
            100
        )
      : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t("formulaCompliance")}
      </h2>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("avgCompletion")}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {avgCompletion}%
        </p>
      </div>
    </div>
  );
}
