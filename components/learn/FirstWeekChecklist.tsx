"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { ClipboardCheck, Check } from "lucide-react";
import { useChecklistStore, CHECKLIST_ITEMS } from "@/hooks/useChecklistStore";

export default function FirstWeekChecklist() {
  const t = useTranslations("Learn");
  const { checked, toggle, _hasHydrated } = useChecklistStore();

  const completedCount = CHECKLIST_ITEMS.filter((item) => checked[item]).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (!_hasHydrated) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("checklistTitle")}
          </h2>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className="w-full flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                checked[item]
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {checked[item] && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <p
                className={`text-sm font-medium transition-colors ${
                  checked[item]
                    ? "text-gray-400 dark:text-gray-500 line-through"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {t(`checklist_${item}`)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t(`checklist_${item}_desc`)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {completedCount === totalCount && (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {t("checklistComplete")}
          </p>
        </div>
      )}
    </Card>
  );
}
