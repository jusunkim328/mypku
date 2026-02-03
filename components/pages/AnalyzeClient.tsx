"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card } from "@/components/ui";
import ImageUploader from "@/components/analyze/ImageUploader";
import AnalysisResult from "@/components/analyze/AnalysisResult";
import VoiceInput from "@/components/analyze/VoiceInput";
import FoodSearchInput from "@/components/analyze/FoodSearchInput";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useStreakStore } from "@/hooks/useStreakStore";
import { toast } from "@/hooks/useToast";
import { showStreakCelebration } from "@/lib/notifications";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";

type AnalysisState = "idle" | "loading" | "success" | "error";
type InputMode = "image" | "voice" | "manual";

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
  const tVoice = useTranslations("VoiceInput");
  const { addMealRecord } = useMealRecords();
  const { mode } = useNutritionStore();
  const { streakMilestones, permission } = useNotificationStore();
  const { currentStreak } = useStreakStore();

  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState<string>("");
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

  // 음성 입력 처리
  const handleVoiceTranscript = async (text: string) => {
    setVoiceText(text);
    setAnalysisState("loading");
    setError("");

    try {
      const response = await fetchWithRetry(
        "/api/voice-analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, mode }),
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
  };

  // 입력 모드 변경 시 상태 초기화
  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setAnalysisState("idle");
    setItems([]);
    setTotalNutrition(null);
    setError("");
    setVoiceText("");
    setImageBase64(null);
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
          body: JSON.stringify({ imageBase64, mode }),
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
  }, [imageBase64, mode, t]);

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

      // 스트릭 마일스톤 알림
      if (streakMilestones && permission === "granted") {
        const newStreak = currentStreak + 1;
        showStreakCelebration(newStreak);
      }

      router.push("/");
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [totalNutrition, items, selectedMealType, imageBase64, addMealRecord, router, t, streakMilestones, permission, currentStreak]);

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
        {/* 입력 모드 탭 */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => handleModeChange("image")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              inputMode === "image"
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t("camera")}
          </button>
          <button
            onClick={() => handleModeChange("voice")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              inputMode === "voice"
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {tVoice("startRecording").split(" ")[0]}
          </button>
          <button
            onClick={() => handleModeChange("manual")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              inputMode === "manual"
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t("manualEntry")}
          </button>
        </div>

        {/* 이미지 업로더 */}
        {inputMode === "image" && (
          <ImageUploader
            imageBase64={imageBase64}
            onImageSelect={handleImageSelect}
          />
        )}

        {/* 음성 입력 */}
        {inputMode === "voice" && analysisState !== "success" && (
          <Card className="p-6">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              onError={(err) => toast.error(err)}
              disabled={analysisState === "loading"}
            />
            {voiceText && (
              <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">&ldquo;{voiceText}&rdquo;</p>
              </div>
            )}
          </Card>
        )}

        {/* 수동 입력 */}
        {inputMode === "manual" && (
          <Card className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t("manualEntryDesc")}</p>
            <FoodSearchInput
              onFoodSelect={(food) => {
                const newItems = [...items, food];
                setItems(newItems);
                // 총 영양소 계산
                const newTotal = newItems.reduce(
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
                setAnalysisState("success");
              }}
            />
          </Card>
        )}

        {/* 분석 버튼 (이미지 모드) */}
        {inputMode === "image" && imageBase64 && analysisState !== "success" && (
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
          <Card className="p-4 bg-red-50 dark:bg-red-900/30">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("mealType")}</h3>
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
