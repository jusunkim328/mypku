"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, NumberInput } from "@/components/ui";
import { Plus } from "lucide-react";
import {
  searchPKUFoods,
  getLowProteinFoods,
  getFoodsByCategory,
  getCategoryLabel,
  FOOD_CATEGORIES,
  type PKUFood,
  type FoodCategory,
} from "@/lib/pkuFoodDatabase";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useCanEdit } from "@/hooks/usePatientContext";
import { toast } from "@/hooks/useToast";
import type { MealType, FoodItem, PKUSafetyLevel } from "@/types/nutrition";

// PKU 안전 등급 계산
const getPkuSafetyLevel = (phe_mg: number): PKUSafetyLevel => {
  if (phe_mg <= 20) return "safe";
  if (phe_mg <= 100) return "caution";
  return "avoid";
};

// PKUFood → FoodItem 변환 함수
const pkuFoodToFoodItem = (food: PKUFood, weight: number): FoodItem => {
  const phe_mg = food.phenylalanine_mg * (weight / 100);
  const exchanges = Math.round((phe_mg / 50) * 10) / 10;

  return {
    id: `pku-${food.id}-${Date.now()}`,
    name: food.name_ko || food.name,
    estimatedWeight_g: weight,
    nutrition: {
      calories: (food.calories || 0) * (weight / 100),
      protein_g: food.protein_g * (weight / 100),
      carbs_g: (food.carbs_g || 0) * (weight / 100),
      fat_g: (food.fat_g || 0) * (weight / 100),
      phenylalanine_mg: phe_mg,
    },
    confidence: 0.95,
    userVerified: true,
    source: "manual",
    pkuSafety: getPkuSafetyLevel(phe_mg),
    exchanges,
  };
};

export default function FoodsClient() {
  const t = useTranslations("FoodsPage");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");
  const tMealTypes = useTranslations("MealTypes");
  const locale = useLocale();

  const { getExchanges } = useUserSettings();
  const { addMealRecord } = useMealRecords();
  const canEdit = useCanEdit();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all" | "low-protein">("all");
  const [foods, setFoods] = useState<PKUFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<PKUFood | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [isAdding, setIsAdding] = useState(false);

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

  // 식사에 추가 모달 열기
  const handleOpenAddModal = (food: PKUFood) => {
    setSelectedFood(food);
    setQuantity(100);
    // 현재 시간에 따라 기본 식사 유형 설정
    const hour = new Date().getHours();
    if (hour < 10) setMealType("breakfast");
    else if (hour < 15) setMealType("lunch");
    else if (hour < 20) setMealType("dinner");
    else setMealType("snack");
    setShowAddModal(true);
  };

  // 식사에 추가
  const handleAddToMeal = async () => {
    if (!selectedFood) return;

    setIsAdding(true);
    try {
      const foodItem = pkuFoodToFoodItem(selectedFood, quantity);

      await addMealRecord({
        timestamp: new Date().toISOString(),
        mealType,
        imageUrl: null,
        items: [foodItem],
        totalNutrition: foodItem.nutrition,
        aiConfidence: null,
      });

      toast.success(t("addedToMeal"));
      setShowAddModal(false);
      setSelectedFood(null);
    } catch (error) {
      console.error("Add to meal error:", error);
      toast.error("Failed to add to meal");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Page>
      <Navbar
        title={t("title")}
        left={
          <Link href="/">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
      />

      <Block className="space-y-6">
        {/* 검색 */}
        <Card className="p-4">
          <div className="flex gap-2 mb-3">
            <label htmlFor="foods-search" className="sr-only">{t("searchPlaceholder")}</label>
            <input
              id="foods-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("searchPlaceholder")}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t("allFoods")}
            </button>
            <button
              onClick={() => handleCategoryChange("low-protein")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "low-protein"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {getCategoryLabel(category, locale)}
              </button>
            ))}
          </div>
        </Card>

        {/* 결과 */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{tCommon("loading")}</p>
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t("noResults")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("resultsCount", { count: foods.length })}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {foods.map((food) => (
              <Card key={food.id} className="p-4 md:p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {food.name_ko || food.name}
                      </h3>
                      {food.is_low_protein && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          {t("lowProteinBadge")}
                        </span>
                      )}
                    </div>

                    {food.brand && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{food.brand}</p>
                    )}

                    {/* 영양 정보 */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {food.phenylalanine_mg}mg
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">Phe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {getExchanges(food.phenylalanine_mg)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{tNutrients("exchanges")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{food.protein_g}g</span>
                        <span className="text-gray-600 dark:text-gray-400">{tNutrients("protein")}</span>
                      </div>
                      {food.calories && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{food.calories}</span>
                          <span className="text-gray-600 dark:text-gray-400">kcal</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {t("per100g", { size: food.serving_size })}
                    </p>
                  </div>

                  {/* 추가 버튼 */}
                  {canEdit && (
                    <button
                      onClick={() => handleOpenAddModal(food)}
                      className="ml-3 flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/70 transition-colors"
                      aria-label={t("addToMeal")}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
            </div>
          </div>
        )}
      </Block>

      {/* 식사에 추가 모달 */}
      {canEdit && showAddModal && selectedFood && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{t("addToMeal")}</h3>

            {/* 선택된 식품 정보 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedFood.name_ko || selectedFood.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Phe: {selectedFood.phenylalanine_mg}mg / 100g
              </p>
            </div>

            {/* 수량 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("selectQuantity")}
              </label>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={2000}
                  defaultValue={100}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-600 dark:text-gray-400">g</span>
              </div>
              {/* 빠른 선택 버튼 */}
              <div className="flex gap-2 mt-2">
                {[50, 100, 150, 200].map((val) => (
                  <button
                    key={val}
                    onClick={() => setQuantity(val)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      quantity === val
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500"
                    }`}
                  >
                    {val}g
                  </button>
                ))}
              </div>
            </div>

            {/* 계산된 영양소 미리보기 */}
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium mb-2">
                {t("nutritionPreview", { quantity })}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {Math.round(selectedFood.phenylalanine_mg * quantity / 100)}mg
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">Phe</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {(selectedFood.protein_g * quantity / 100).toFixed(1)}g
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">{tNutrients("protein")}</span>
                </div>
                {selectedFood.calories && (
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {Math.round(selectedFood.calories * quantity / 100)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">kcal</span>
                  </div>
                )}
              </div>
            </div>

            {/* 식사 유형 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("selectMealType")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mealType === type
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500"
                    }`}
                  >
                    {tMealTypes(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <Button
                outline
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedFood(null);
                }}
                className="flex-1"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleAddToMeal}
                disabled={isAdding}
                className="flex-1"
              >
                {isAdding ? tCommon("loading") : t("addFood")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
