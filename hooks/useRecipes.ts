"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeItem, RecipeCategory } from "@/types/recipe";
import type { PKUSafetyLevel } from "@/types/nutrition";

/** Escape special PostgREST filter characters to prevent injection */
function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_\\()*,.!]/g, "");
}

const VALID_CATEGORIES: RecipeCategory[] = ["breakfast", "lunch", "dinner", "snack", "dessert", "side"];

function rowToRecipe(row: Record<string, unknown>): Recipe {
  const cat = String(row.category ?? "snack");
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    nameKo: row.name_ko ? String(row.name_ko) : null,
    nameRu: row.name_ru ? String(row.name_ru) : null,
    description: row.description ? String(row.description) : null,
    category: VALID_CATEGORIES.includes(cat as RecipeCategory) ? (cat as RecipeCategory) : "snack",
    imageUrl: row.image_url ? String(row.image_url) : null,
    servings: Number(row.servings) || 1,
    prepTimeMin: row.prep_time_min != null ? Number(row.prep_time_min) : null,
    cookTimeMin: row.cook_time_min != null ? Number(row.cook_time_min) : null,
    instructions: row.instructions ? String(row.instructions) : null,
    instructionsKo: row.instructions_ko ? String(row.instructions_ko) : null,
    instructionsRu: row.instructions_ru ? String(row.instructions_ru) : null,
    totalPheMg: Number(row.total_phe_mg) || 0,
    totalProteinG: Number(row.total_protein_g) || 0,
    totalCalories: Number(row.total_calories) || 0,
    pkuSafety: (row.pku_safety as PKUSafetyLevel) || "safe",
    exchanges: Number(row.exchanges) || 0,
    isVerified: Boolean(row.is_verified),
    source: row.source ? String(row.source) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function rowToRecipeItem(row: Record<string, unknown>): RecipeItem {
  return {
    id: String(row.id),
    recipeId: String(row.recipe_id),
    name: String(row.name ?? ""),
    nameKo: row.name_ko ? String(row.name_ko) : null,
    nameRu: row.name_ru ? String(row.name_ru) : null,
    amount: Number(row.amount) || 0,
    unit: String(row.unit ?? ""),
    phenylalanineMg: Number(row.phenylalanine_mg) || 0,
    proteinG: Number(row.protein_g) || 0,
    calories: Number(row.calories) || 0,
    isOptional: Boolean(row.is_optional),
    sortOrder: Number(row.sort_order) || 0,
  };
}

interface UseRecipesReturn {
  recipes: Recipe[];
  isLoading: boolean;
  selectedCategory: RecipeCategory | "all";
  setCategory: (cat: RecipeCategory | "all") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fetchRecipeDetail: (id: string) => Promise<Recipe | null>;
}

export function useRecipes(): UseRecipesReturn {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setSearchQueryDebounced = useCallback((q: string) => {
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(q), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const supabase = createClient();

  const fetchRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (debouncedSearch.trim()) {
        const q = sanitizeSearchQuery(debouncedSearch.trim());
        if (q) {
          query = query.or(`name.ilike.%${q}%,name_ko.ilike.%${q}%,name_ru.ilike.%${q}%,description.ilike.%${q}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setRecipes((data ?? []).map((row) => rowToRecipe(row as Record<string, unknown>)));
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const fetchRecipeDetail = useCallback(
    async (id: string): Promise<Recipe | null> => {
      try {
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", id)
          .single();

        if (recipeError || !recipeData) return null;

        const { data: itemsData, error: itemsError } = await supabase
          .from("recipe_items")
          .select("*")
          .eq("recipe_id", id)
          .order("sort_order", { ascending: true });

        if (itemsError) {
          console.error("Failed to fetch recipe items:", itemsError);
        }

        const recipe = rowToRecipe(recipeData as Record<string, unknown>);
        recipe.items = (itemsData ?? []).map((row) => rowToRecipeItem(row as Record<string, unknown>));

        return recipe;
      } catch (error) {
        console.error("Failed to fetch recipe detail:", error);
        return null;
      }
    },
    []
  );

  return {
    recipes,
    isLoading,
    selectedCategory,
    setCategory: setSelectedCategory,
    searchQuery,
    setSearchQuery: setSearchQueryDebounced,
    fetchRecipeDetail,
  };
}
