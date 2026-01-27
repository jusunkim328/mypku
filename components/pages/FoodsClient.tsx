"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Card } from "@/components/ui";
import {
  searchPKUFoods,
  getLowProteinFoods,
  getFoodsByCategory,
  getCategoryLabel,
  FOOD_CATEGORIES,
  type PKUFood,
  type FoodCategory,
} from "@/lib/pkuFoodDatabase";
import { useNutritionStore } from "@/hooks/useNutritionStore";

export default function FoodsClient() {
  const t = useTranslations("FoodsPage");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");

  const { getExchanges } = useNutritionStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all" | "low-protein">("all");
  const [foods, setFoods] = useState<PKUFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 초기 로드 - 저단백 식품 표시
  useEffect(() => {
    loadInitialFoods();
  }, []);

  const loadInitialFoods = async () => {
    setIsLoading(true);
    try {
      const lowProteinFoods = await getLowProteinFoods(20);
      setFoods(lowProteinFoods);
    } catch (error) {
      console.error("Initial load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 실행
  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedCategory === "all") {
      loadInitialFoods();
      return;
    }

    setIsLoading(true);
    try {
      if (selectedCategory === "low-protein") {
        const results = searchQuery.trim()
          ? await searchPKUFoods({ query: searchQuery, lowProteinOnly: true })
          : await getLowProteinFoods();
        setFoods(results);
      } else if (selectedCategory !== "all") {
        const results = searchQuery.trim()
          ? await searchPKUFoods({ query: searchQuery, category: selectedCategory })
          : await getFoodsByCategory(selectedCategory);
        setFoods(results);
      } else {
        const results = await searchPKUFoods({ query: searchQuery });
        setFoods(results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 카테고리 변경
  const handleCategoryChange = async (category: FoodCategory | "all" | "low-protein") => {
    setSelectedCategory(category);
    setIsLoading(true);

    try {
      if (category === "low-protein") {
        const results = await getLowProteinFoods();
        setFoods(results);
      } else if (category !== "all") {
        const results = await getFoodsByCategory(category);
        setFoods(results);
      } else {
        loadInitialFoods();
      }
    } catch (error) {
      console.error("Category change error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">{tCommon("back")}</span>
            </button>
          </Link>
          <h1 className="text-xl font-bold flex-1">{t("title")}</h1>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 검색 */}
        <Card className="p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("searchPlaceholder")}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {t("search")}
            </Button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("allFoods")}
            </button>
            <button
              onClick={() => handleCategoryChange("low-protein")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "low-protein"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("lowProtein")}
            </button>
            {FOOD_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {getCategoryLabel(category, "ko")}
              </button>
            ))}
          </div>
        </Card>

        {/* 결과 */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{tCommon("loading")}</p>
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t("noResults")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {t("resultsCount", { count: foods.length })}
            </p>
            {foods.map((food) => (
              <Card key={food.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {food.name_ko || food.name}
                      </h3>
                      {food.is_low_protein && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {t("lowProteinBadge")}
                        </span>
                      )}
                    </div>

                    {food.brand && (
                      <p className="text-sm text-gray-500">{food.brand}</p>
                    )}

                    {/* 영양 정보 */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-bold">
                          {food.phenylalanine_mg}mg
                        </span>
                        <span className="text-gray-600">Phe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {getExchanges(food.phenylalanine_mg)}
                        </span>
                        <span className="text-gray-600">{tNutrients("exchanges")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{food.protein_g}g</span>
                        <span className="text-gray-600">{tNutrients("protein")}</span>
                      </div>
                      {food.calories && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{food.calories}</span>
                          <span className="text-gray-600">kcal</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {t("per100g", { size: food.serving_size })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
