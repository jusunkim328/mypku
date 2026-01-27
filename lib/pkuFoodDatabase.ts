import { createClient } from "@/lib/supabase/client";

export interface PKUFood {
  id: string;
  name: string;
  name_ko?: string;
  brand?: string;
  barcode?: string;
  serving_size: string;
  phenylalanine_mg: number;
  protein_g: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
  category?: string;
  is_low_protein: boolean;
  source: string;
}

export interface FoodSearchOptions {
  query: string;
  category?: string;
  lowProteinOnly?: boolean;
  limit?: number;
}

/**
 * PKU 식품 검색
 */
export async function searchPKUFoods(options: FoodSearchOptions): Promise<PKUFood[]> {
  const { query, category, lowProteinOnly, limit = 20 } = options;

  const supabase = createClient();

  let queryBuilder = supabase
    .from("pku_foods")
    .select("*")
    .or(`name.ilike.%${query}%,name_ko.ilike.%${query}%`)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (lowProteinOnly) {
    queryBuilder = queryBuilder.eq("is_low_protein", true);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("PKU food search error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 바코드로 식품 조회
 */
export async function getFoodByBarcode(barcode: string): Promise<PKUFood | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (error) {
    console.error("Barcode lookup error:", error);
    return null;
  }

  return data as PKUFood;
}

/**
 * 카테고리별 식품 조회
 */
export async function getFoodsByCategory(category: string, limit = 50): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("category", category)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Category lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 저단백 식품 전체 조회
 */
export async function getLowProteinFoods(limit = 50): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .eq("is_low_protein", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Low protein foods lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * Phe 함량 범위로 검색
 */
export async function getFoodsByPheRange(
  minPhe: number,
  maxPhe: number,
  limit = 50
): Promise<PKUFood[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .select("*")
    .gte("phenylalanine_mg", minPhe)
    .lte("phenylalanine_mg", maxPhe)
    .order("phenylalanine_mg", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Phe range lookup error:", error);
    return [];
  }

  return (data || []) as PKUFood[];
}

/**
 * 식품 추가 (인증된 사용자만)
 */
export async function addPKUFood(food: Omit<PKUFood, "id">): Promise<PKUFood | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pku_foods")
    .insert([food] as any)
    .select()
    .single();

  if (error) {
    console.error("Add PKU food error:", error);
    return null;
  }

  return data as PKUFood;
}

/**
 * 카테고리 목록
 */
export const FOOD_CATEGORIES = [
  "fruit",
  "vegetable",
  "grain",
  "meat",
  "dairy",
  "legume",
  "processed",
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

/**
 * 카테고리 라벨 (다국어)
 */
export function getCategoryLabel(category: FoodCategory, locale: string = "en"): string {
  const labels: Record<FoodCategory, Record<string, string>> = {
    fruit: { en: "Fruits", ko: "과일" },
    vegetable: { en: "Vegetables", ko: "채소" },
    grain: { en: "Grains", ko: "곡물" },
    meat: { en: "Meat & Fish", ko: "육류 & 생선" },
    dairy: { en: "Dairy", ko: "유제품" },
    legume: { en: "Legumes", ko: "콩류" },
    processed: { en: "Processed Foods", ko: "가공식품" },
  };

  return labels[category]?.[locale] || category;
}
