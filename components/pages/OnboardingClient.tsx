"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Preloader } from "@/components/ui";
import { ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/contexts/AuthContext";
import { PKU_PHE_DEFAULTS, PKU_EXCHANGE } from "@/lib/constants";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepWelcome from "@/components/onboarding/StepWelcome";
import StepPheSetup from "@/components/onboarding/StepPheSetup";
import StepFormula from "@/components/onboarding/StepFormula";
import StepConfirm from "@/components/onboarding/StepConfirm";
import StepFamilyInvite from "@/components/onboarding/StepFamilyInvite";

interface OnboardingData {
  diagnosisAgeGroup: string | null;
  pheAllowance: number;
  exchangeUnit: number;
  usesFormula: boolean;
  formulaName: string;
  formulaServingAmount: number;
  formulaServingUnit: string;
  formulaTimeSlots: string[];
}

export default function OnboardingClient() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    onboardingCompleted,
    setDailyGoals,
    completeOnboarding,
    setDiagnosisAgeGroup,
    setFormulaSettings,
  } = useUserSettings();

  // 이미 완료된 사용자가 /onboarding 직접 접근 시 홈으로
  useEffect(() => {
    if (authLoading) return;
    if (onboardingCompleted) {
      router.replace("/");
    }
  }, [onboardingCompleted, authLoading, router]);

  const totalSteps = isAuthenticated ? 5 : 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    diagnosisAgeGroup: null,
    pheAllowance: PKU_PHE_DEFAULTS.DEFAULT,
    exchangeUnit: PKU_EXCHANGE.STANDARD,
    usesFormula: false,
    formulaName: "",
    formulaServingAmount: 200,
    formulaServingUnit: "ml",
    formulaTimeSlots: ["morning", "noon", "evening", "bedtime"],
  });

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const saveAndComplete = async () => {
    setSaving(true);
    try {
      // Save daily goals
      await setDailyGoals({
        phenylalanine_mg: data.pheAllowance,
      });

      // Save diagnosis age group
      setDiagnosisAgeGroup(data.diagnosisAgeGroup);

      // Save formula settings if active
      if (data.usesFormula) {
        setFormulaSettings({
          formulaName: data.formulaName || "PKU Formula",
          servingAmount: data.formulaServingAmount,
          servingUnit: data.formulaServingUnit as "ml" | "g" | "scoop",
          timeSlots: data.formulaTimeSlots,
          isActive: true,
        });
      }

      // Mark both as completed — 단일 DB 호출로 동시 저장
      await completeOnboarding();

      router.push("/");
    } catch (error) {
      console.error("[Onboarding] Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = () => {
    saveAndComplete();
  };

  const handleSkip = async () => {
    // Apply defaults and mark complete — 단일 DB 호출로 동시 저장
    await completeOnboarding();
    router.push("/");
  };

  // Determine if the last "content" step is showing (Step 4 for guest, Step 5 for logged in)
  const isLastStep = currentStep === totalSteps;
  // Step 4 (Confirm) is where we show the "get started" button for guests
  // Step 5 (FamilyInvite) is the last for logged-in users
  const isConfirmStep = currentStep === 4;

  // 로딩 중이거나 이미 완료된 사용자 → 리다이렉트 대기
  if (authLoading || onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-950">
        <Preloader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Progress */}
        <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />

        {/* Step content */}
        <div className="flex-1">
          {currentStep === 1 && (
            <StepWelcome
              diagnosisAgeGroup={data.diagnosisAgeGroup}
              onUpdate={(group) => updateData({ diagnosisAgeGroup: group })}
            />
          )}
          {currentStep === 2 && (
            <StepPheSetup
              pheAllowance={data.pheAllowance}
              exchangeUnit={data.exchangeUnit}
              onUpdate={updateData}
            />
          )}
          {currentStep === 3 && (
            <StepFormula
              usesFormula={data.usesFormula}
              formulaName={data.formulaName}
              formulaServingAmount={data.formulaServingAmount}
              formulaServingUnit={data.formulaServingUnit}
              formulaTimeSlots={data.formulaTimeSlots}
              onUpdate={updateData}
            />
          )}
          {currentStep === 4 && <StepConfirm data={data} />}
          {currentStep === 5 && isAuthenticated && <StepFamilyInvite />}
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 space-y-3 pb-safe">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button outline className="flex-1" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t("back")}
              </Button>
            )}

            {isLastStep || (isConfirmStep && !isAuthenticated) ? (
              <Button
                className="flex-1"
                onClick={handleComplete}
                loading={saving}
              >
                <Rocket className="w-4 h-4 mr-1" />
                {t("getStarted")}
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNext}>
                {t("next")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Skip option on step 1 */}
          {currentStep === 1 && (
            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 transition-colors"
            >
              {t("skipForNow")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
