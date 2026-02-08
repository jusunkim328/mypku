"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { toast } from "@/hooks/useToast";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";

interface AddToFavoriteButtonProps {
  items: FoodItem[];
  totalNutrition: NutritionData;
  mealType: MealType;
}

export default function AddToFavoriteButton({
  items,
  totalNutrition,
  mealType,
}: AddToFavoriteButtonProps) {
  const tFav = useTranslations("Favorites");
  const { addFavorite } = useFavoriteMeals();
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await addFavorite(trimmed, items, totalNutrition, mealType);
    toast.success(tFav("added"));
    setName("");
    setShowInput(false);
  };

  if (showInput) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") setShowInput(false);
          }}
          placeholder={tFav("namePlaceholder")}
          className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 w-32"
          autoFocus
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-2 py-1 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {tFav("addFavorite")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
      title={tFav("addFavorite")}
    >
      <Heart className="w-4 h-4" />
    </button>
  );
}
