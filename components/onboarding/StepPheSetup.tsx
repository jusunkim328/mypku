"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { NumberInput } from "@/components/ui";
import { Check, Camera, Edit3 } from "lucide-react";
import { PKU_PHE_DEFAULTS, PKU_EXCHANGE } from "@/lib/constants";
import DiagnosisOCR from "@/components/onboarding/DiagnosisOCR";

interface StepPheSetupProps {
  pheAllowance: number;
  exchangeUnit: number;
  onUpdate: (updates: {
    pheAllowance?: number;
    exchangeUnit?: number;
    bloodPheTargetMin?: number;
    bloodPheTargetMax?: number;
    bloodPheUnit?: "umol/L" | "mg/dL";
  }) => void;
}

type InputMode = "choose" | "ocr" | "manual";

export default function StepPheSetup({
  pheAllowance,
  exchangeUnit,
  onUpdate,
}: StepPheSetupProps) {
  const t = useTranslations("Onboarding");
  const tNutrients = useTranslations("Nutrients");
  const [inputMode, setInputMode] = useState<InputMode>("choose");

  const calculateExchanges = (phe: number) => Math.round((phe / exchangeUnit) * 10) / 10;

  const handleOCRValues = useCallback(
    (values: {
      phenylalanine_mg?: number;
      blood_phe_target_min?: number;
      blood_phe_target_max?: number;
      blood_phe_unit?: "umol/L" | "mg/dL";
      exchange_unit_mg?: number;
    }) => {
      const updates: Parameters<typeof onUpdate>[0] = {};
      if (values.phenylalanine_mg) updates.pheAllowance = values.phenylalanine_mg;
      if (values.exchange_unit_mg) updates.exchangeUnit = values.exchange_unit_mg;
      if (values.blood_phe_target_min) updates.bloodPheTargetMin = values.blood_phe_target_min;
      if (values.blood_phe_target_max) updates.bloodPheTargetMax = values.blood_phe_target_max;
      if (values.blood_phe_unit) updates.bloodPheUnit = values.blood_phe_unit;
      onUpdate(updates);
      setInputMode("manual");
    },
    [onUpdate]
  );

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

      {/* Choose mode: scan or manual */}
      {inputMode === "choose" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {t("scanOrManual")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setInputMode("ocr")}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all text-center space-y-2"
            >
              <Camera className="w-8 h-8 mx-auto text-indigo-500" />
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("scanDocument")}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t("scanDocumentDesc")}
              </span>
            </button>
            <button
              onClick={() => setInputMode("manual")}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all text-center space-y-2"
            >
              <Edit3 className="w-8 h-8 mx-auto text-indigo-500" />
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("enterManually")}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t("enterManuallyDesc")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* OCR mode */}
      {inputMode === "ocr" && (
        <DiagnosisOCR
          onValuesExtracted={handleOCRValues}
          onFallbackToManual={() => setInputMode("manual")}
        />
      )}

      {/* Manual mode: existing form */}
      {inputMode === "manual" && (
        <>
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
        </>
      )}
    </div>
  );
}
