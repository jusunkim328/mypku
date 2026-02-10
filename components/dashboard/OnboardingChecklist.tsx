"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui";
import { Check, Circle, PartyPopper } from "lucide-react";

interface OnboardingChecklistProps {
  hasProfile: boolean;
  hasPheGoal: boolean;
  hasMealRecord: boolean;
  hasFormula: boolean;
  hasBloodLevel: boolean;
  onDismiss: () => void;
}

export default function OnboardingChecklist({
  hasProfile,
  hasPheGoal,
  hasMealRecord,
  hasFormula,
  hasBloodLevel,
  onDismiss,
}: OnboardingChecklistProps) {
  const t = useTranslations("OnboardingChecklist");

  const allCompleted = hasProfile && hasPheGoal && hasMealRecord && hasFormula && hasBloodLevel;

  const items = [
    { key: "profileSetup" as const, done: hasProfile, href: "/onboarding" as const },
    { key: "pheGoal" as const, done: hasPheGoal, href: "/settings" as const },
    { key: "firstMeal" as const, done: hasMealRecord, href: "/analyze" as const },
    { key: "formulaSetup" as const, done: hasFormula, href: "/settings" as const },
    { key: "firstBloodTest" as const, done: hasBloodLevel, href: "/blood-levels" as const },
  ];

  const completedCount = items.filter((i) => i.done).length;

  if (allCompleted) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <PartyPopper className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {t("complete")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t("title")}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            {item.done ? (
              <div className="flex items-center gap-2.5 py-1">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                  {t(item.key)}
                </span>
              </div>
            ) : (
              <Link href={item.href} className="flex items-center gap-2.5 py-1 group">
                <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-primary-400 transition-colors" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {t(item.key)}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors min-h-[44px] w-full text-center"
      >
        {t("dismiss")}
      </button>
    </Card>
  );
}
