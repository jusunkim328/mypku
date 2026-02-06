"use client";

import { useTranslations } from "next-intl";
import { NumberInput } from "@/components/ui";
import { Check } from "lucide-react";
import { PKU_PHE_DEFAULTS, PKU_EXCHANGE } from "@/lib/constants";

interface StepPheSetupProps {
  pheAllowance: number;
  exchangeUnit: number;
  onUpdate: (updates: { pheAllowance?: number; exchangeUnit?: number }) => void;
}

export default function StepPheSetup({ pheAllowance, exchangeUnit, onUpdate }: StepPheSetupProps) {
  const t = useTranslations("Onboarding");
  const tNutrients = useTranslations("Nutrients");

  const calculateExchanges = (phe: number) => Math.round((phe / exchangeUnit) * 10) / 10;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t("step2Title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("step2Subtitle")}
        </p>
      </div>

      {/* Phe Allowance */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("pheAllowanceLabel")}
        </label>
        <NumberInput
          value={pheAllowance}
          onChange={(val) => onUpdate({ pheAllowance: val })}
          min={50}
          max={2000}
          defaultValue={PKU_PHE_DEFAULTS.DEFAULT}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("pheAllowanceHint")} &middot; = {calculateExchanges(pheAllowance)} {tNutrients("exchanges")}
        </p>

        {/* Quick select */}
        <div className="flex flex-wrap gap-2">
          {[PKU_PHE_DEFAULTS.INFANT, PKU_PHE_DEFAULTS.DEFAULT, PKU_PHE_DEFAULTS.ADULT, 500].map((val) => (
            <button
              key={val}
              onClick={() => onUpdate({ pheAllowance: val })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pheAllowance === val
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {val}mg
            </button>
          ))}
        </div>
      </div>

      {/* Exchange Unit */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exchangeLabel")}
        </label>
        <div className="space-y-2">
          {[
            { value: PKU_EXCHANGE.STANDARD, label: t("exchange50"), desc: t("exchange50Desc") },
            { value: PKU_EXCHANGE.DETAILED, label: t("exchange15"), desc: t("exchange15Desc") },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate({ exchangeUnit: option.value })}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                exchangeUnit === option.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {option.desc}
                  </p>
                </div>
                {exchangeUnit === option.value && (
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
