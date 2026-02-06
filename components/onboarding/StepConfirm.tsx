"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

interface OnboardingData {
  diagnosisAgeGroup: string | null;
  pheAllowance: number;
  exchangeUnit: number;
  usesFormula: boolean;
  formulaName: string;
  formulaServingAmount: number;
  formulaServingUnit: string;
  formulaTimeSlots: string[];
}

interface StepConfirmProps {
  data: OnboardingData;
}

export default function StepConfirm({ data }: StepConfirmProps) {
  const t = useTranslations("Onboarding");
  const tNutrients = useTranslations("Nutrients");

  const calculateExchanges = (phe: number) =>
    Math.round((phe / data.exchangeUnit) * 10) / 10;

  const diagnosisLabel = data.diagnosisAgeGroup
    ? t(data.diagnosisAgeGroup)
    : t("notSet");

  const formulaLabel = data.usesFormula
    ? t("summaryFormulaActive", {
        name: data.formulaName || "PKU Formula",
        amount: data.formulaServingAmount,
        unit: data.formulaServingUnit,
        slots: data.formulaTimeSlots.length,
      })
    : t("summaryFormulaNone");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t("step4Title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("step4Subtitle")}
        </p>
      </div>

      {/* Settings summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 space-y-4">
        <SummaryRow
          label={t("summaryDiagnosis")}
          value={diagnosisLabel}
        />
        <SummaryRow
          label={t("summaryPheAllowance")}
          value={`${data.pheAllowance}mg`}
        />
        <SummaryRow
          label={t("summaryExchange")}
          value={`${data.exchangeUnit}mg`}
        />
        <SummaryRow
          label={t("summaryExchanges")}
          value={`${calculateExchanges(data.pheAllowance)} ${tNutrients("exchanges")}`}
          highlight
        />
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <SummaryRow
            label={t("summaryFormula")}
            value={formulaLabel}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {t("canChangeAnytime")}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
