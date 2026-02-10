import type { PKUSafetyLevel } from "./nutrition";

export type RecipeCategory = "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | "side";

export interface Recipe {
  id: string;
  name: string;
  nameKo: string | null;
  nameRu: string | null;
  description: string | null;
  category: RecipeCategory;
  imageUrl: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  instructions: string | null;
  instructionsKo: string | null;
  instructionsRu: string | null;
  totalPheMg: number;
  totalProteinG: number;
  totalCalories: number;
  pkuSafety: PKUSafetyLevel;
  exchanges: number;
  isVerified: boolean;
  source: string | null;
  createdAt: string;
  items?: RecipeItem[];
  isFavorited?: boolean;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  name: string;
  nameKo: string | null;
  nameRu: string | null;
  amount: number;
  unit: string;
  phenylalanineMg: number;
  proteinG: number;
  calories: number;
  isOptional: boolean;
  sortOrder: number;
}
