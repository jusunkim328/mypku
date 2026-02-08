"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Trash2, RotateCcw } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { FavoriteMeal } from "@/hooks/useFavoriteMeals";

interface FavoriteMealCardProps {
  favorite: FavoriteMeal;
  onReRecord: (fav: FavoriteMeal) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export default function FavoriteMealCard({
  favorite,
  onReRecord,
  onRemove,
  compact = false,
}: FavoriteMealCardProps) {
  const tFav = useTranslations("Favorites");
  const { getExchanges } = useUserSettings();

  const phe = Math.round(favorite.totalNutrition.phenylalanine_mg || 0);
  const exchanges = getExchanges(phe);

  if (compact) {
    return (
      <div className="flex-shrink-0 w-40 bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 shadow-soft">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {favorite.name}
        </p>
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
          {phe}mg Phe / {exchanges}Ex
        </p>
        {favorite.useCount > 0 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {tFav("usedCount", { count: favorite.useCount })}
          </p>
        )}
        <button
          onClick={() => onReRecord(favorite)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg py-1.5 hover:from-primary-600 hover:to-primary-700 transition-all active:scale-[0.98]"
        >
          <RotateCcw className="w-3 h-3" />
          {tFav("reRecord")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {favorite.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {favorite.items.map((i) => i.name).join(", ")}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {phe}mg Phe
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {exchanges} Ex
            </span>
            {favorite.useCount > 0 && (
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                {tFav("usedCount", { count: favorite.useCount })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            small
            onClick={() => onReRecord(favorite)}
            className="!text-xs !px-2.5 !py-1"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {tFav("reRecord")}
          </Button>
          {onRemove && (
            <button
              onClick={() => onRemove(favorite.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title={tFav("removeFavorite")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
