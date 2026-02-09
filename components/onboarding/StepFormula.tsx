"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, NumberInput } from "@/components/ui";
import { FlaskConical, X, Plus } from "lucide-react";
import { ALL_SLOTS } from "@/lib/formulaSlotDefaults";

interface StepFormulaProps {
  usesFormula: boolean;
  formulaName: string;
  formulaServingAmount: number;
  formulaServingUnit: string;
  formulaTimeSlots: string[];
  onUpdate: (updates: {
    usesFormula?: boolean;
    formulaName?: string;
    formulaServingAmount?: number;
    formulaServingUnit?: string;
    formulaTimeSlots?: string[];
  }) => void;
}
const SERVING_UNITS = ["ml", "g", "scoop"];

export default function StepFormula({
  usesFormula,
  formulaName,
  formulaServingAmount,
  formulaServingUnit,
  formulaTimeSlots,
  onUpdate,
}: StepFormulaProps) {
  const t = useTranslations("Onboarding");
  const [formulaChoice, setFormulaChoice] = useState<"yes" | "no" | null>(
    usesFormula ? "yes" : null
  );

  const handleChoice = (choice: "yes" | "no") => {
    setFormulaChoice(choice);
    onUpdate({ usesFormula: choice === "yes" });
    if (choice === "yes" && formulaTimeSlots.length === 0) {
      onUpdate({ formulaTimeSlots: [...ALL_SLOTS] });
    }
  };

  const toggleSlot = (slot: string) => {
    const updated = formulaTimeSlots.includes(slot)
      ? formulaTimeSlots.filter((s) => s !== slot)
      : [...formulaTimeSlots, slot];
    onUpdate({ formulaTimeSlots: updated });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
          <FlaskConical className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t("step3Title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("step3Subtitle")}
        </p>
      </div>

      {/* Formula choice */}
      <div className="space-y-2">
        <button
          onClick={() => handleChoice("yes")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formulaChoice === "yes"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {t("formulaYes")}
          </span>
        </button>
        <button
          onClick={() => handleChoice("no")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formulaChoice === "no"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {t("formulaNo")}
          </span>
        </button>
      </div>

      {/* Formula details (only when "yes") */}
      {formulaChoice === "yes" && (
        <div className="space-y-4 animate-fade-in">
          {/* Formula name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("formulaNameLabel")}
            </label>
            <Input
              value={formulaName}
              onChange={(e) => onUpdate({ formulaName: e.target.value })}
              placeholder={t("formulaNamePlaceholder")}
            />
          </div>

          {/* Serving amount + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("servingAmountLabel")}
              </label>
              <NumberInput
                value={formulaServingAmount}
                onChange={(val) => onUpdate({ formulaServingAmount: val })}
                min={1}
                max={1000}
                defaultValue={200}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("servingUnitLabel")}
              </label>
              <div className="flex gap-1.5">
                {SERVING_UNITS.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => onUpdate({ formulaServingUnit: unit })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      formulaServingUnit === unit
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("timeSlotsLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    formulaTimeSlots.includes(slot)
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-transparent"
                  }`}
                >
                  {formulaTimeSlots.includes(slot) ? (
                    <X className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {t(slot)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
