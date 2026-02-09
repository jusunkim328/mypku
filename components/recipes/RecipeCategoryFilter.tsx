"use client";

import { useTranslations } from "next-intl";
import type { RecipeCategory } from "@/types/recipe";

const CATEGORIES: (RecipeCategory | "all")[] = [
  "all",
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "side",
];

interface RecipeCategoryFilterProps {
  selected: RecipeCategory | "all";
  onChange: (category: RecipeCategory | "all") => void;
}

export default function RecipeCategoryFilter({ selected, onChange }: RecipeCategoryFilterProps) {
  const t = useTranslations("Recipes");

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {CATEGORIES.map((cat) => {
        const isActive = cat === selected;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              ${
                isActive
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }
            `}
          >
            {t(cat)}
          </button>
        );
      })}
    </div>
  );
}
