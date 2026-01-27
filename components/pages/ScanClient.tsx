"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import BarcodeScanner from "@/components/scan/BarcodeScanner";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import { toast } from "@/hooks/useToast";
import type { NutritionData, MealType } from "@/types/nutrition";

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

  const { mode, _hasHydrated } = useNutritionStore();
  const { addMealRecord } = useMealRecords();
  const isPKU = mode === "pku";

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
            <p className="mt-2 text-gray-600">{t("searching")}</p>
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
                    <h3 className="font-semibold">{scanResult.product.name}</h3>
                    {scanResult.product.brand && (
                      <p className="text-sm text-gray-500">{scanResult.product.brand}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {t("barcode")}: {scanResult.barcode}
                    </p>
                  </div>
                </div>

                {/* 서빙 사이즈 조절 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("servingSize")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={servingSize}
                      onChange={(e) => setServingSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{servingSize}g</span>
                  </div>
                </div>

                {/* 영양 정보 */}
                {calculatedNutrition && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">{t("nutritionInfo")}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {isPKU && (
                        <div className="col-span-2 bg-indigo-100 rounded p-2">
                          <span className="text-indigo-700 font-medium">
                            {tNutrients("phenylalanine")}: {calculatedNutrition.phenylalanine_mg}mg
                          </span>
                          {scanResult.product.nutrition_per_100g.phenylalanine_estimated && (
                            <span className="text-xs text-indigo-500 ml-2">({t("estimated")})</span>
                          )}
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">{tNutrients("calories")}:</span>{" "}
                        <span className="font-medium">{calculatedNutrition.calories}kcal</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{tNutrients("protein")}:</span>{" "}
                        <span className="font-medium">{calculatedNutrition.protein_g}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{tNutrients("carbs")}:</span>{" "}
                        <span className="font-medium">{calculatedNutrition.carbs_g}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{tNutrients("fat")}:</span>{" "}
                        <span className="font-medium">{calculatedNutrition.fat_g}g</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 식사 유형 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 mb-2">{t("productNotFound")}</p>
                <p className="text-sm text-gray-400 mb-4">
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
