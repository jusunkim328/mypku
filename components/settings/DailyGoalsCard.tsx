"use client";

import { useTranslations } from "next-intl";
import { Card, Button, NumberInput } from "@/components/ui";
import { DEFAULT_DAILY_GOALS } from "@/types/nutrition";
import type { DailyGoals } from "@/types/nutrition";

interface DailyGoalsCardProps {
  draftGoals: DailyGoals;
  setDraftGoals: React.Dispatch<React.SetStateAction<DailyGoals>>;
  disabled?: boolean;
  getExchanges: (phe: number) => number;
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
            = {getExchanges(draftGoals.phenylalanine_mg || DEFAULT_DAILY_GOALS.phenylalanine_mg)} {tNutrients("exchanges")} (1 {tNutrients("exchange")} = 50mg)
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
