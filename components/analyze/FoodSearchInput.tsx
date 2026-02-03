"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { type PKUFood } from "@/lib/pkuFoodDatabase";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { FoodItem } from "@/types/nutrition";

interface FoodSearchInputProps {
  onFoodSelect: (food: FoodItem) => void;
}

// PKUFood → FoodItem 변환
const pkuFoodToFoodItem = (food: PKUFood, weight: number): FoodItem => ({
  id: `manual-${food.id}-${Date.now()}`,
  name: food.name_ko || food.name,
  estimatedWeight_g: weight,
  nutrition: {
    calories: (food.calories || 0) * (weight / 100),
    protein_g: food.protein_g * (weight / 100),
    carbs_g: (food.carbs_g || 0) * (weight / 100),
    fat_g: (food.fat_g || 0) * (weight / 100),
    phenylalanine_mg: food.phenylalanine_mg * (weight / 100),
  },
  confidence: 0.95,
  userVerified: true,
  source: "manual",
});

export default function FoodSearchInput({ onFoodSelect }: FoodSearchInputProps) {
  const t = useTranslations("FoodsPage");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");

  const { getExchanges } = useUserSettings();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PKUFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFood, setSelectedFood] = useState<PKUFood | null>(null);
  const [weight, setWeight] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 디바운스된 검색 (API 사용)
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/foods/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();

      if (data.foods) {
        setResults(data.foods);
        setShowDropdown(data.foods.length > 0);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 검색어 변경 시 디바운스 적용
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, debouncedSearch]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 식품 선택
  const handleSelectFood = (food: PKUFood) => {
    setSelectedFood(food);
    setQuery(food.name_ko || food.name);
    setShowDropdown(false);
  };

  // 식사에 추가
  const handleAddFood = () => {
    if (!selectedFood) return;

    const foodItem = pkuFoodToFoodItem(selectedFood, weight);
    onFoodSelect(foodItem);

    // 초기화
    setSelectedFood(null);
    setQuery("");
    setWeight(100);
    setResults([]);
  };

  // 취소
  const handleCancel = () => {
    setSelectedFood(null);
    setQuery("");
    setWeight(100);
    setResults([]);
  };

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={t("searchPlaceholder")}
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* 로딩 인디케이터 */}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 검색 결과 드롭다운 */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {results.map((food) => (
              <button
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {food.name_ko || food.name}
                    </p>
                    {food.brand && (
                      <p className="text-xs text-gray-500">{food.brand}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">
                      {food.phenylalanine_mg}mg
                    </p>
                    <p className="text-xs text-gray-500">Phe/100g</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 선택된 식품 상세 */}
      {selectedFood && (
        <div className="bg-indigo-50 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-indigo-900">
                {selectedFood.name_ko || selectedFood.name}
              </h4>
              {selectedFood.brand && (
                <p className="text-sm text-indigo-700">{selectedFood.brand}</p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 수량 입력 */}
          <div>
            <label className="block text-sm font-medium text-indigo-800 mb-2">
              {t("selectQuantity")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="1"
                max="2000"
              />
              <span className="text-indigo-700">g</span>
            </div>
            {/* 빠른 선택 버튼 */}
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200].map((val) => (
                <button
                  key={val}
                  onClick={() => setWeight(val)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    weight === val
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {val}g
                </button>
              ))}
            </div>
          </div>

          {/* 영양소 미리보기 */}
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-indigo-800 font-medium mb-2">
              {weight}g 영양소:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-indigo-600 font-bold">
                  {Math.round(selectedFood.phenylalanine_mg * weight / 100)}mg
                </span>
                <span className="text-gray-600 ml-1">Phe</span>
              </div>
              <div>
                <span className="font-semibold">
                  {getExchanges(selectedFood.phenylalanine_mg * weight / 100)}
                </span>
                <span className="text-gray-600 ml-1">{tNutrients("exchanges")}</span>
              </div>
              <div>
                <span className="font-semibold">
                  {(selectedFood.protein_g * weight / 100).toFixed(1)}g
                </span>
                <span className="text-gray-600 ml-1">{tNutrients("protein")}</span>
              </div>
              {selectedFood.calories && (
                <div>
                  <span className="font-semibold">
                    {Math.round(selectedFood.calories * weight / 100)}
                  </span>
                  <span className="text-gray-600 ml-1">kcal</span>
                </div>
              )}
            </div>
          </div>

          {/* 추가 버튼 */}
          <button
            onClick={handleAddFood}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {t("addFood")}
          </button>
        </div>
      )}
    </div>
  );
}
