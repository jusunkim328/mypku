"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

export default function StepFamilyInvite() {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t("step5Title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("step5Subtitle")}
        </p>
      </div>

      {/* Coming soon placeholder */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
          {t("step5ComingSoon")}
        </p>
      </div>
    </div>
  );
}
