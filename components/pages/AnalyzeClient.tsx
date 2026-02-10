"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card } from "@/components/ui";
import ImageUploader from "@/components/analyze/ImageUploader";
import AnalysisResult from "@/components/analyze/AnalysisResult";
import VoiceInput from "@/components/analyze/VoiceInput";
import FoodSearchInput from "@/components/analyze/FoodSearchInput";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useAuth } from "@/contexts/AuthContext";
import LoginPromptCard from "@/components/common/LoginPromptCard";
import { useCanEdit } from "@/hooks/usePatientContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useStreakStore } from "@/hooks/useStreakStore";
import { toast } from "@/hooks/useToast";
import { showStreakCelebration } from "@/lib/notifications";
import { recommendMealType } from "@/lib/mealTypeRecommend";
import { startRecording, logRecordingMetrics } from "@/lib/analytics";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { calculateTotalNutrition } from "@/lib/nutrition";
import { fetchWithRetry } from "@/lib/retry";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import FavoriteMealCard from "@/components/favorites/FavoriteMealCard";
import LiveAnalysis from "@/components/analyze/LiveAnalysis";
import { Heart, Radio, Camera as CameraIcon, Mic as MicIcon, Search as SearchIcon } from "lucide-react";
import type { FoodItem, NutritionData, MealType } from "@/types/nutrition";

type AnalysisState = "idle" | "loading" | "success" | "error";
type InputMode = "image" | "voice" | "manual" | "favorites" | "live";

export default function AnalyzeClient() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("AnalyzePage");
  const tCommon = useTranslations("Common");
  const tMeals = useTranslations("MealTypes");
  const tOffline = useTranslations("OfflineBanner");
  const { addMealRecord } = useMealRecords();
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const { streakMilestones, permission } = useNotificationStore();
  const { currentStreak } = useStreakStore();
  const preferManualEntry = useNutritionStore((s) => s.preferManualEntry);
  const isOnline = useNetworkStatus();
  const { favorites, removeFavorite } = useFavoriteMeals();
  const tFav = useTranslations("Favorites");
  const searchParams = useSearchParams();

  const tabs = useMemo<{ mode: InputMode; label: string; icon: React.ReactNode; activeColor?: string }[]>(() => [
    { mode: "live", label: t("tabVideoTalk"), icon: <Radio className="w-4 h-4" />, activeColor: "text-red-600 dark:text-red-400" },
    { mode: "image", label: t("tabPicture"), icon: <CameraIcon className="w-4 h-4" /> },
    { mode: "voice", label: t("tabVoice"), icon: <MicIcon className="w-4 h-4" /> },
    { mode: "manual", label: t("tabManualEntry"), icon: <SearchIcon className="w-4 h-4" /> },
    { mode: "favorites", label: tFav("tab"), icon: <Heart className="w-4 h-4" /> },
  ], [t, tFav]);

  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [totalNutrition, setTotalNutrition] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(recommendMealType);

  // URL 파라미터 또는 preferManualEntry 설정에 따른 초기 모드
  const initialModeSet = useRef(false);
  const modeParam = searchParams.get("mode");
  useEffect(() => {
    if (initialModeSet.current) return;
    if (modeParam && ["manual", "image", "voice", "live", "favorites"].includes(modeParam)) {
      setInputMode(modeParam as InputMode);
      initialModeSet.current = true;
      return;
    }
    if (preferManualEntry) {
      setInputMode("manual");
      initialModeSet.current = true;
    }
  }, [modeParam, preferManualEntry]);

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
    startRecording();

    try {
      const response = await fetchWithRetry(
        "/api/voice-analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, locale }),
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      if (response.status === 401) {
        setAnalysisState("idle");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setItems(data.items);
        setTotalNutrition(data.totalNutrition);
        setAnalysisState("success");
        logRecordingMetrics("analysis_complete");
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
    startRecording();

    try {
      const response = await fetchWithRetry(
        "/api/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
        },
        { maxRetries: 3, baseDelayMs: 1000 }
      );

      if (response.status === 401) {
        setAnalysisState("idle");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setItems(data.items);
        setTotalNutrition(data.totalNutrition);
        setAnalysisState("success");
        logRecordingMetrics("analysis_complete");
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
      logRecordingMetrics("save_complete");

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
    setTotalNutrition(calculateTotalNutrition(updatedItems));
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
          {tabs.map(({ mode, label, icon, activeColor }) => {
            const isActive = inputMode === mode;
            const color = isActive
              ? activeColor || "text-indigo-600 dark:text-indigo-400"
              : "text-gray-600 dark:text-gray-400";
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${color} ${
                  isActive ? "bg-white dark:bg-gray-700 shadow-sm" : ""
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* 이미지 업로더 */}
        {inputMode === "image" && (
          isAuthenticated ? (
            <ImageUploader
              imageBase64={imageBase64}
              onImageSelect={handleImageSelect}
            />
          ) : (
            <LoginPromptCard features={["featureAnalyze"]} />
          )
        )}

        {/* 음성 입력 */}
        {inputMode === "voice" && analysisState !== "success" && (
          isAuthenticated ? (
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
          ) : (
            <LoginPromptCard features={["featureVoice"]} />
          )
        )}

        {/* 수동 입력 */}
        {inputMode === "manual" && (
          <Card className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t("manualEntryDesc")}</p>
            <FoodSearchInput
              onFoodSelect={(food) => {
                const newItems = [...items, food];
                setItems(newItems);
                setTotalNutrition(calculateTotalNutrition(newItems));
                setAnalysisState("success");
              }}
            />
          </Card>
        )}

        {/* 라이브 분석 */}
        {inputMode === "live" && (
          isAuthenticated ? (
            <LiveAnalysis
              onSave={(liveItems, liveNutrition) => {
                setItems(liveItems);
                setTotalNutrition(liveNutrition);
                setAnalysisState("success");
                setInputMode("image"); // 결과 표시 모드로 전환
              }}
            />
          ) : (
            <LoginPromptCard features={["featureAnalyze", "featureVoice"]} />
          )
        )}

        {/* 즐겨찾기 */}
        {inputMode === "favorites" && (
          <Card className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{tFav("noFavoritesHint")}</p>
            {favorites.length === 0 ? (
              <p className="text-center text-gray-400 py-8">{tFav("noFavorites")}</p>
            ) : (
              <div className="space-y-3">
                {favorites.map((fav) => (
                  <FavoriteMealCard
                    key={fav.id}
                    favorite={fav}
                    onReRecord={(f) => {
                      setItems(f.items);
                      setTotalNutrition(f.totalNutrition);
                      setSelectedMealType(f.mealType);
                      setAnalysisState("success");
                    }}
                    onRemove={(id) => removeFavorite(id)}
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 분석 버튼 (이미지 모드) */}
        {isAuthenticated && inputMode === "image" && imageBase64 && analysisState !== "success" && (
          <Button
            large
            onClick={handleAnalyze}
            loading={analysisState === "loading"}
            disabled={!isOnline}
            className="w-full"
          >
            {analysisState === "loading" ? t("analyzing") : t("startAnalysis")}
          </Button>
        )}

        {!isOnline && inputMode === "image" && imageBase64 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            {tOffline("analyzing")}
          </p>
        )}

        {/* 에러 메시지 */}
        {analysisState === "error" && (
          <Card className="p-4 bg-red-50 dark:bg-red-900/30">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <div className="flex gap-2 mt-3">
              <Button small outline onClick={handleAnalyze}>
                {tCommon("retry")}
              </Button>
              <Button small onClick={() => handleModeChange("manual")}>
                {t("switchToManual")}
              </Button>
            </div>
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
            <Button large onClick={handleSave} loading={isSaving} disabled={!canEdit} className="w-full">
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
