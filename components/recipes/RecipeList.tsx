"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Preloader } from "@/components/ui";
import RecipeCard from "./RecipeCard";
import type { Recipe } from "@/types/recipe";

interface RecipeListProps {
  recipes: Recipe[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isFavorited: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectRecipe: (id: string) => void;
}

export default function RecipeList({
  recipes,
  isLoading,
  searchQuery,
  onSearchChange,
  isFavorited,
  onToggleFavorite,
  onSelectRecipe,
}: RecipeListProps) {
  const t = useTranslations("Recipes");

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("search")}
          className="
            w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
            dark:focus:border-primary-400 dark:focus:ring-primary-400/20
            transition-all duration-200
          "
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Preloader />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-sm">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={isFavorited(recipe.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectRecipe}
            />
          ))}
        </div>
      )}
    </div>
  );
}
