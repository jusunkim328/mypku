"use client";

import { useTranslations } from "next-intl";
import { Baby, User, GraduationCap, Briefcase, Heart } from "lucide-react";

type AgeGroup = "newborn" | "child" | "teen" | "adult";

interface StepWelcomeProps {
  diagnosisAgeGroup: string | null;
  onUpdate: (group: AgeGroup | null) => void;
}

const AGE_GROUPS: { value: AgeGroup; icon: React.ReactNode }[] = [
  { value: "newborn", icon: <Baby className="w-5 h-5" /> },
  { value: "child", icon: <Heart className="w-5 h-5" /> },
  { value: "teen", icon: <GraduationCap className="w-5 h-5" /> },
  { value: "adult", icon: <Briefcase className="w-5 h-5" /> },
];

export default function StepWelcome({ diagnosisAgeGroup, onUpdate }: StepWelcomeProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
          <span className="text-white font-bold text-2xl">P</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("step1Title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("step1Subtitle")}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t("step1Reassurance")}
        </p>
      </div>

      {/* Diagnosis age group selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("diagnosisAgeGroup")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {AGE_GROUPS.map(({ value, icon }) => (
            <button
              key={value}
              onClick={() => onUpdate(value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                diagnosisAgeGroup === value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`mb-2 ${
                diagnosisAgeGroup === value
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}>
                {icon}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {t(value)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t(`${value}Desc`)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
