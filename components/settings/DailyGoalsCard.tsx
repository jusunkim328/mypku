"use client";

import { useTranslations } from "next-intl";
import { Card, Button, NumberInput } from "@/components/ui";
import { DEFAULT_DAILY_GOALS } from "@/types/nutrition";
import { PKU_EXCHANGE } from "@/lib/constants";
import type { DailyGoals } from "@/types/nutrition";

const EXCHANGE_OPTIONS = [
  { value: PKU_EXCHANGE.STANDARD, label: "50mg" },
  { value: 25, label: "25mg" },
  { value: 20, label: "20mg" },
  { value: PKU_EXCHANGE.DETAILED, label: "15mg" },
];

interface DailyGoalsCardProps {
  draftGoals: DailyGoals;
  setDraftGoals: React.Dispatch<React.SetStateAction<DailyGoals>>;
  disabled?: boolean;
  getExchanges: (phe: number) => number;
  phePerExchange: number;
  onPhePerExchangeChange: (value: number) => void;
  hasChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const inputClassName =
  "w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all";

export default function DailyGoalsCard({
  draftGoals,
  setDraftGoals,
  disabled,
  getExchanges,
  phePerExchange,
  onPhePerExchangeChange,
  hasChanges,
  onSave,
  onCancel,
  isSaving,
}: DailyGoalsCardProps) {
  const t = useTranslations("SettingsPage");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");

  return (
    <Card className="p-4 md:p-5 lg:p-6 lg:col-span-2">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t("dailyGoals")}
      </h3>
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {tNutrients("phenylalanine")} (mg)
          </label>
          <NumberInput
            value={draftGoals.phenylalanine_mg || DEFAULT_DAILY_GOALS.phenylalanine_mg}
            onChange={(value) => setDraftGoals((prev) => ({ ...prev, phenylalanine_mg: value }))}
            min={50}
            max={1000}
            defaultValue={DEFAULT_DAILY_GOALS.phenylalanine_mg}
            disabled={disabled}
            className={inputClassName}
          />
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
            = {getExchanges(draftGoals.phenylalanine_mg || DEFAULT_DAILY_GOALS.phenylalanine_mg)} {tNutrients("exchanges")} (1 {tNutrients("exchange")} = {phePerExchange}mg)
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {t("exchangeUnit")}
          </label>
          <div className="flex gap-2 mt-1.5">
            {EXCHANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onPhePerExchangeChange(opt.value)}
                disabled={disabled}
                className={`flex-1 px-2 py-2 text-sm font-medium rounded-xl border transition-all ${
                  phePerExchange === opt.value
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400"
                } disabled:opacity-50`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t("exchangeUnitHint")}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {tNutrients("calories")} (kcal)
          </label>
          <NumberInput
            value={draftGoals.calories}
            onChange={(value) => setDraftGoals((prev) => ({ ...prev, calories: value }))}
            min={500}
            max={5000}
            defaultValue={DEFAULT_DAILY_GOALS.calories}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {tNutrients("protein")} (g)
          </label>
          <NumberInput
            value={draftGoals.protein_g}
            onChange={(value) => setDraftGoals((prev) => ({ ...prev, protein_g: value }))}
            min={10}
            max={200}
            defaultValue={DEFAULT_DAILY_GOALS.protein_g}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {tNutrients("carbs")} (g)
          </label>
          <NumberInput
            value={draftGoals.carbs_g}
            onChange={(value) => setDraftGoals((prev) => ({ ...prev, carbs_g: value }))}
            min={50}
            max={500}
            defaultValue={DEFAULT_DAILY_GOALS.carbs_g}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {tNutrients("fat")} (g)
          </label>
          <NumberInput
            value={draftGoals.fat_g}
            onChange={(value) => setDraftGoals((prev) => ({ ...prev, fat_g: value }))}
            min={10}
            max={200}
            defaultValue={DEFAULT_DAILY_GOALS.fat_g}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      </div>
      {hasChanges && !disabled && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button outline onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      )}
    </Card>
  );
}
