"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Button } from "@/components/ui";
import { Lock, Check } from "lucide-react";

type FeatureKey = "featureAnalyze" | "featureVoice" | "featureCoaching" | "featureBarcodeOcr";

interface LoginPromptCardProps {
  features?: FeatureKey[];
  compact?: boolean;
}

export default function LoginPromptCard({ features, compact = false }: LoginPromptCardProps) {
  const t = useTranslations("LoginPrompt");
  const { signInWithGoogle } = useAuth();

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Lock className="w-4 h-4" />
          <span>{t("title")}</span>
        </div>
        <Button small onClick={() => signInWithGoogle()}>
          {t("loginButton")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("description")}
          </p>
        </div>

        {features && features.length > 0 && (
          <ul className="w-full text-left space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {t(feature)}
              </li>
            ))}
          </ul>
        )}

        <Button large onClick={() => signInWithGoogle()} className="w-full">
          {t("loginButton")}
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("freeFeatures")}
        </p>
      </div>
    </Card>
  );
}
