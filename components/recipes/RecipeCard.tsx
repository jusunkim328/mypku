"use client";

import { useTranslations, useLocale } from "next-intl";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui";
import type { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
}

const SAFETY_COLORS = {
  safe: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  caution: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  avoid: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
} as const;

export default function RecipeCard({ recipe, isFavorited, onToggleFavorite, onSelect }: RecipeCardProps) {
  const t = useTranslations("Recipes");
  const tNutrients = useTranslations("Nutrients");
  const locale = useLocale();

  const displayName =
    locale === "ko" && recipe.nameKo
      ? recipe.nameKo
      : locale === "ru" && recipe.nameRu
        ? recipe.nameRu
        : recipe.name;

  return (
    <div role="button" tabIndex={0} onClick={() => onSelect(recipe.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(recipe.id); }} className="cursor-pointer">
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </h3>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium">
              {t(recipe.category)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SAFETY_COLORS[recipe.pkuSafety]}`}>
              {recipe.pkuSafety}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {tNutrients("phenylalanine")}: <strong className="text-gray-700 dark:text-gray-300">{recipe.totalPheMg}mg</strong>
            </span>
            <span>
              {tNutrients("exchange")}: <strong className="text-gray-700 dark:text-gray-300">{recipe.exchanges}</strong>
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className="flex-shrink-0 p-2 -m-2 transition-colors"
          aria-label={isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-200 ${
              isFavorited
                ? "fill-red-500 text-red-500"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      </div>
    </Card>
    </div>
  );
}
