"use client";

import { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Heart, Clock, Users } from "lucide-react";
import type { Recipe } from "@/types/recipe";

interface RecipeDetailProps {
  recipe: Recipe;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
}

const SAFETY_COLORS = {
  safe: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  caution: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  avoid: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
} as const;

export default function RecipeDetail({ recipe, isFavorited, onToggleFavorite, onClose }: RecipeDetailProps) {
  const t = useTranslations("Recipes");
  const tNutrients = useTranslations("Nutrients");
  const locale = useLocale();

  // Lock body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const displayName =
    locale === "ko" && recipe.nameKo
      ? recipe.nameKo
      : locale === "ru" && recipe.nameRu
        ? recipe.nameRu
        : recipe.name;

  const displayInstructions =
    locale === "ko" && recipe.instructionsKo
      ? recipe.instructionsKo
      : locale === "ru" && recipe.instructionsRu
        ? recipe.instructionsRu
        : recipe.instructions;

  const phePerServing = recipe.servings > 0 ? Math.round(recipe.totalPheMg / recipe.servings) : recipe.totalPheMg;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-elevated animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 mr-2 truncate">
            {displayName}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(recipe.id)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorited
                    ? "fill-red-500 text-red-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Meta info */}
          <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SAFETY_COLORS[recipe.pkuSafety]}`}>
              {recipe.pkuSafety}
            </span>
            {recipe.servings > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {t("servings")}: {recipe.servings}
              </span>
            )}
            {recipe.prepTimeMin != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t("prepTime")}: {recipe.prepTimeMin}{t("minutes")}
              </span>
            )}
            {recipe.cookTimeMin != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t("cookTime")}: {recipe.cookTimeMin}{t("minutes")}
              </span>
            )}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {recipe.description}
            </p>
          )}

          {/* Nutrition summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{tNutrients("phenylalanine")}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.totalPheMg}mg</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{phePerServing}mg {t("perServing")}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{tNutrients("exchange")}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.exchanges}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{tNutrients("protein")}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.totalProteinG}g</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{tNutrients("calories")}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{recipe.totalCalories}</p>
            </div>
          </div>

          {/* Ingredients */}
          {recipe.items && recipe.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("ingredients")}
              </h3>
              <ul className="space-y-2">
                {recipe.items.map((item) => {
                  const itemName =
                    locale === "ko" && item.nameKo
                      ? item.nameKo
                      : locale === "ru" && item.nameRu
                        ? item.nameRu
                        : item.name;

                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {itemName}
                        {item.isOptional && (
                          <span className="ml-1 text-xs text-gray-400 italic">({t("optional")})</span>
                        )}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {item.amount} {item.unit} · {item.phenylalanineMg}mg Phe
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {displayInstructions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("instructions")}
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                {displayInstructions}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
            {t("communityDisclaimer")}
          </div>
        </div>
      </div>
    </div>
  );
}
