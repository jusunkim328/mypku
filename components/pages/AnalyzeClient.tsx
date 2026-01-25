"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card } from "@/components/ui";
import ImageUploader from "@/components/analyze/ImageUploader";
import AnalysisResult from "@/components/analyze/AnalysisResult";
import { useMealRecords } from "@/hooks/useMealRecords";
import { toast } from "@/hooks/useToast";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";

type AnalysisState = "idle" | "loading" | "success" | "error";

// Exponential Backoff로 재시도
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response;
      }
      // 5xx 에러는 재시도
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network error");
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed");
}

export default function AnalyzeClient() {
  const router = useRouter();
  const t = useTranslations("AnalyzePage");
  const tCommon = useTranslations("Common");
  const tMeals = useTranslations("MealTypes");
  const { addMealRecord } = useMealRecords();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64) return;

    setAnalysisState("loading");
    setError("");

    try {
      const response = await fetchWithRetry(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
        },
        3,
        1000
      );

      const data = await response.json();

      if (data.success) {
        setItems(data.items);
        setTotalNutrition(data.totalNutrition);
        setAnalysisState("success");
        toast.success(t("analysisComplete"));
      } else {
        const errorMessage = data.error || t("analysisFailed");
        setError(errorMessage);
        setAnalysisState("error");
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("networkError");
      setError(errorMessage);
      setAnalysisState("error");
      toast.error(errorMessage);
    }
  }, [imageBase64, t]);

  const handleSave = useCallback(async () => {
    if (!totalNutrition || items.length === 0) return;

    setIsSaving(true);
    try {
      await addMealRecord(
        {
          timestamp: new Date().toISOString(),
          mealType: selectedMealType,
          imageUrl: null,
          items,
          totalNutrition,
          aiConfidence: items[0]?.confidence || null,
        },
        imageBase64 || undefined
      );
      toast.success(t("recordSaved"));
      router.push("/");
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [totalNutrition, items, selectedMealType, imageBase64, addMealRecord, router, t]);

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

  const mealTypes: { value: MealType; labelKey: keyof IntlMessages["MealTypes"] }[] = [
    { value: "breakfast", labelKey: "breakfast" },
    { value: "lunch", labelKey: "lunch" },
    { value: "dinner", labelKey: "dinner" },
    { value: "snack", labelKey: "snack" },
  ];

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
            loading={analysisState === "loading"}
            className="w-full"
          >
            {analysisState === "loading" ? t("analyzing") : t("startAnalysis")}
          </Button>
        )}

        {/* 에러 메시지 */}
        {analysisState === "error" && (
          <Card className="p-4 bg-red-50">
            <p className="text-red-600 text-sm">{error}</p>
            <Button small outline className="mt-2" onClick={handleAnalyze}>
              {tCommon("retry")}
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
              <h3 className="text-sm font-semibold mb-2">{t("mealType")}</h3>
              <div className="flex gap-2">
                {mealTypes.map((type) => (
                  <Button
                    key={type.value}
                    small
                    outline={selectedMealType !== type.value}
                    onClick={() => setSelectedMealType(type.value)}
                  >
                    {tMeals(type.labelKey)}
                  </Button>
                ))}
              </div>
            </Card>

            {/* 저장 버튼 */}
            <Button large onClick={handleSave} loading={isSaving} className="w-full">
              {t("saveRecord")}
            </Button>
          </>
        )}
      </Block>
    </Page>
  );
}

// Type helper for translations
type IntlMessages = {
  MealTypes: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };
};
