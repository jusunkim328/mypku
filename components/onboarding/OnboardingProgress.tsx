"use client";

import { useTranslations } from "next-intl";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="mb-8">
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
        {t("stepOf", { current: currentStep, total: totalSteps })}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              step <= currentStep
                ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
