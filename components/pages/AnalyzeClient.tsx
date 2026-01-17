"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import ImageUploader from "@/components/analyze/ImageUploader";
import AnalysisResult from "@/components/analyze/AnalysisResult";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";

type AnalysisState = "idle" | "loading" | "success" | "error";

export default function AnalyzeClient() {
  const router = useRouter();
  const { addMealRecord } = useNutritionStore();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [totalNutrition, setTotalNutrition] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");

  const handleImageSelect = (base64: string) => {
    setImageBase64(base64);
    setAnalysisState("idle");
    setItems([]);
    setTotalNutrition(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;

    setAnalysisState("loading");
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();

      if (data.success) {
        setItems(data.items);
        setTotalNutrition(data.totalNutrition);
        setAnalysisState("success");
      } else {
        setError(data.error || "분석 실패");
        setAnalysisState("error");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setAnalysisState("error");
    }
  };

  const handleSave = () => {
    if (!totalNutrition || items.length === 0) return;

    const record = {
      id: `meal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mealType: selectedMealType,
      imageBase64: imageBase64 || undefined,
      items,
      totalNutrition,
    };

    addMealRecord(record);
    router.push("/");
  };

  const handleItemUpdate = (id: string, updates: Partial<FoodItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, userVerified: true } : item
      )
    );

    // 총 영양소 재계산
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    const newTotal = updatedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.nutrition.calories,
        protein_g: acc.protein_g + item.nutrition.protein_g,
        carbs_g: acc.carbs_g + item.nutrition.carbs_g,
        fat_g: acc.fat_g + item.nutrition.fat_g,
        phenylalanine_mg:
          (acc.phenylalanine_mg || 0) + (item.nutrition.phenylalanine_mg || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, phenylalanine_mg: 0 }
    );
    setTotalNutrition(newTotal);
  };

  const mealTypes: { value: MealType; label: string }[] = [
    { value: "breakfast", label: "아침" },
    { value: "lunch", label: "점심" },
    { value: "dinner", label: "저녁" },
    { value: "snack", label: "간식" },
  ];

  return (
    <Page>
      <Navbar
        title="음식 분석"
        left={
          <Link href="/">
            <Button clear small>
              뒤로
            </Button>
          </Link>
        }
      />

      <Block className="space-y-4">
        {/* 이미지 업로더 */}
        <ImageUploader
          imageBase64={imageBase64}
          onImageSelect={handleImageSelect}
        />

        {/* 분석 버튼 */}
        {imageBase64 && analysisState !== "success" && (
          <Button
            large
            onClick={handleAnalyze}
            disabled={analysisState === "loading"}
            className="w-full"
          >
            {analysisState === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <Preloader />
                분석 중...
              </span>
            ) : (
              "AI 분석 시작"
            )}
          </Button>
        )}

        {/* 에러 메시지 */}
        {analysisState === "error" && (
          <Card className="p-4 bg-red-50">
            <p className="text-red-600 text-sm">{error}</p>
            <Button small outline className="mt-2" onClick={handleAnalyze}>
              다시 시도
            </Button>
          </Card>
        )}

        {/* 분석 결과 */}
        {analysisState === "success" && totalNutrition && (
          <>
            <AnalysisResult
              items={items}
              totalNutrition={totalNutrition}
              onItemUpdate={handleItemUpdate}
            />

            {/* 식사 유형 선택 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2">식사 유형</h3>
              <div className="flex gap-2">
                {mealTypes.map((type) => (
                  <Button
                    key={type.value}
                    small
                    outline={selectedMealType !== type.value}
                    onClick={() => setSelectedMealType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </Card>

            {/* 저장 버튼 */}
            <Button large onClick={handleSave} className="w-full">
              기록 저장
            </Button>
          </>
        )}
      </Block>
    </Page>
  );
}
