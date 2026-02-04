"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, NumberInput } from "@/components/ui";
import { ChevronRight, Check, Sparkles } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";

interface QuickSetupProps {
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export default function QuickSetup({ onComplete }: QuickSetupProps) {
  const t = useTranslations("QuickSetup");
  const tNutrients = useTranslations("Nutrients");

  const { dailyGoals, setDailyGoals, setQuickSetupCompleted } = useUserSettings();

  const [step, setStep] = useState<Step>(1);
  const [pheAllowance, setPheAllowance] = useState(dailyGoals.phenylalanine_mg || 300);
  const [exchangeUnit, setExchangeUnit] = useState(50); // 1 Exchange = 50mg Phe (기본값)

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleComplete = async () => {
    // 설정 저장
    await setDailyGoals({
      phenylalanine_mg: pheAllowance,
    });

    // 퀵셋업 완료 표시
    setQuickSetupCompleted(true);
    onComplete();
  };

  const handleSkip = () => {
    // 기본값으로 완료
    setQuickSetupCompleted(true);
    onComplete();
  };

  // Exchange 계산
  const calculateExchanges = (phe: number) => Math.round((phe / exchangeUnit) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">{t("welcomeTag")}</span>
          </div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm opacity-80 mt-1">{t("subtitle")}</p>

          {/* 진행 표시 */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("step1Title")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t("step1Desc")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tNutrients("phenylalanine")} (mg/day)
                </label>
                <NumberInput
                  value={pheAllowance}
                  onChange={setPheAllowance}
                  min={50}
                  max={2000}
                  defaultValue={300}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  = {calculateExchanges(pheAllowance)} {tNutrients("exchanges")}
                </p>
              </div>

              {/* 빠른 선택 버튼 */}
              <div className="flex flex-wrap gap-2">
                {[200, 300, 400, 500].map((val) => (
                  <button
                    key={val}
                    onClick={() => setPheAllowance(val)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      pheAllowance === val
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {val}mg
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("step2Title")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t("step2Desc")}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 50, label: "50mg", desc: t("exchange50Desc") },
                  { value: 15, label: "15mg", desc: t("exchange15Desc") },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExchangeUnit(option.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      exchangeUnit === option.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          1 Exchange = {option.label} Phe
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.desc}
                        </p>
                      </div>
                      {exchangeUnit === option.value && (
                        <Check className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("step3Title")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t("step3Desc")}
                </p>
              </div>

              {/* 설정 요약 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("dailyPheAllowance")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {pheAllowance}mg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("exchangeUnit")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {exchangeUnit}mg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t("dailyExchanges")}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                    {calculateExchanges(pheAllowance)} {tNutrients("exchanges")}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t("canChangeAnytime")}
              </p>
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="p-6 pt-0 flex gap-3">
          {step === 1 ? (
            <>
              <Button outline className="flex-1" onClick={handleSkip}>
                {t("skipForNow")}
              </Button>
              <Button className="flex-1" onClick={handleNext}>
                {t("next")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : step === 2 ? (
            <>
              <Button outline className="flex-1" onClick={handleBack}>
                {t("back")}
              </Button>
              <Button className="flex-1" onClick={handleNext}>
                {t("next")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button outline className="flex-1" onClick={handleBack}>
                {t("back")}
              </Button>
              <Button className="flex-1" onClick={handleComplete}>
                <Check className="w-4 h-4 mr-1" />
                {t("complete")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
