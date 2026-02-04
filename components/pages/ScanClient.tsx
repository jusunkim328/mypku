"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import BarcodeScanner from "@/components/scan/BarcodeScanner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMealRecords } from "@/hooks/useMealRecords";
import { toast } from "@/hooks/useToast";
import type { NutritionData, MealType, PKUSafetyLevel } from "@/types/nutrition";

// PKU 안전 등급 계산
const getPkuSafetyLevel = (phe_mg: number): PKUSafetyLevel => {
  if (phe_mg <= 20) return "safe";
  if (phe_mg <= 100) return "caution";
  return "avoid";
};

interface ProductResult {
  name: string;
  brand: string | null;
  serving_size: string;
  image_url: string | null;
  categories: string[];
  nutrition_per_100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    phenylalanine_mg: number;
    phenylalanine_estimated: boolean;
  };
}

interface ScanResult {
  found: boolean;
  barcode: string;
  product?: ProductResult;
  message?: string;
}

export default function ScanClient() {
  const t = useTranslations("ScanPage");
  const tCommon = useTranslations("Common");
  const tMeals = useTranslations("MealTypes");
  const tNutrients = useTranslations("Nutrients");

  const { _hasHydrated } = useUserSettings();
  const { addMealRecord } = useMealRecords();

  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [servingSize, setServingSize] = useState(100);
  const [mealType, setMealType] = useState<MealType>("snack");

  // 바코드 조회
  const handleBarcodeScan = async (barcode: string) => {
    setIsLoading(true);
    setScanResult(null);

    try {
      const response = await fetch(`/api/barcode?barcode=${barcode}`);
      const data = await response.json();

      if (response.ok) {
        setScanResult({ found: true, barcode, ...data });
        toast.success(t("productFound"));
      } else if (response.status === 404) {
        setScanResult({ found: false, barcode, message: data.message });
        toast.warning(t("productNotFound"));
      } else if (response.status === 504) {
        toast.error(t("timeoutError"));
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toast.error(t("lookupError"));
    } finally {
      setIsLoading(false);
    }
  };

  // 서빙 사이즈에 따른 영양소 계산
  const calculateNutrition = (): NutritionData | null => {
    if (!scanResult?.product) return null;

    const ratio = servingSize / 100;
    const nutrition = scanResult.product.nutrition_per_100g;

    return {
      calories: Math.round(nutrition.calories * ratio),
      protein_g: Math.round(nutrition.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(nutrition.carbs_g * ratio * 10) / 10,
      fat_g: Math.round(nutrition.fat_g * ratio * 10) / 10,
      phenylalanine_mg: Math.round(nutrition.phenylalanine_mg * ratio),
    };
  };

  // 식사 기록 저장
  const handleSave = async () => {
    if (!scanResult?.product) return;

    const nutrition = calculateNutrition();
    if (!nutrition) return;

    try {
      await addMealRecord({
        timestamp: new Date().toISOString(),
        mealType,
        imageUrl: scanResult.product.image_url || null,
        items: [
          {
            id: `food-${Date.now()}`,
            name: scanResult.product.name,
            estimatedWeight_g: servingSize,
            nutrition,
            confidence: 0.95, // 바코드 스캔은 신뢰도 높음
            userVerified: false,
            source: "barcode",
            pkuSafety: getPkuSafetyLevel(nutrition.phenylalanine_mg || 0),
            exchanges: Math.round(((nutrition.phenylalanine_mg || 0) / 50) * 10) / 10,
          },
        ],
        totalNutrition: nutrition,
        aiConfidence: 0.95,
      });

      toast.success(t("recordSaved"));
      setScanResult(null);
      setServingSize(100);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("saveFailed"));
    }
  };

  // 하이드레이션 대기
  if (!_hasHydrated) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

  const calculatedNutrition = calculateNutrition();

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
        {/* 바코드 스캐너 */}
        {!scanResult && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onError={(error) => toast.error(error)}
          />
        )}

        {/* 로딩 */}
        {isLoading && (
          <Card className="p-6 text-center">
            <Preloader />
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t("searching")}</p>
          </Card>
        )}

        {/* 스캔 결과 */}
        {scanResult && !isLoading && (
          <>
            {scanResult.found && scanResult.product ? (
              <Card className="p-4 space-y-4">
                {/* 제품 정보 */}
                <div className="flex gap-4">
                  {scanResult.product.image_url && (
                    <img
                      src={scanResult.product.image_url}
                      alt={scanResult.product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{scanResult.product.name}</h3>
                    {scanResult.product.brand && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{scanResult.product.brand}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t("barcode")}: {scanResult.barcode}
                    </p>
                  </div>
                </div>

                {/* 서빙 사이즈 조절 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("servingSize")}
                  </label>
                  <div className="flex items-center gap-3">
                    {/* 슬라이더: step 10 → 5 */}
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="5"
                      value={servingSize}
                      onChange={(e) => setServingSize(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    {/* 숫자 입력 필드 (기존 span → input) */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={servingSize}
                        onChange={(e) => {
                          // 입력 중에는 범위 제한 없이 자유롭게 입력 허용
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 0) {
                            setServingSize(value);
                          }
                        }}
                        onBlur={() => {
                          // 포커스 잃을 때만 범위 검증 (10~500)
                          setServingSize(Math.min(500, Math.max(10, servingSize || 10)));
                        }}
                        onFocus={(e) => e.target.select()}
                        min="10"
                        max="500"
                        className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="text-gray-600 dark:text-gray-400 text-sm">g</span>
                    </div>
                  </div>

                  {/* 빠른 선택 버튼 */}
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 150, 200].map((val) => (
                      <button
                        key={val}
                        onClick={() => setServingSize(val)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          servingSize === val
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {val}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* 영양 정보 */}
                {calculatedNutrition && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t("nutritionInfo")}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Phe 정보 (PKU 전용) */}
                      <div className="col-span-2 bg-indigo-100 dark:bg-indigo-900/40 rounded p-2">
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                          {tNutrients("phenylalanine")}: {calculatedNutrition.phenylalanine_mg}mg
                        </span>
                        {scanResult.product.nutrition_per_100g.phenylalanine_estimated && (
                          <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-2">({t("estimated")})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{tNutrients("calories")}:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{calculatedNutrition.calories}kcal</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{tNutrients("protein")}:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{calculatedNutrition.protein_g}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{tNutrients("carbs")}:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{calculatedNutrition.carbs_g}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{tNutrients("fat")}:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{calculatedNutrition.fat_g}g</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 식사 유형 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("mealType")}
                  </label>
                  <div className="flex gap-2">
                    {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mealType === type
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {tMeals(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2">
                  <Button
                    outline
                    className="flex-1"
                    onClick={() => setScanResult(null)}
                  >
                    {t("scanAnother")}
                  </Button>
                  <Button className="flex-1" onClick={handleSave}>
                    {t("saveRecord")}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{t("productNotFound")}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  {t("barcode")}: {scanResult.barcode}
                </p>
                <Button onClick={() => setScanResult(null)}>
                  {t("scanAnother")}
                </Button>
              </Card>
            )}
          </>
        )}
      </Block>
    </Page>
  );
}
