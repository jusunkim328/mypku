"use client";

import { useTranslations } from "next-intl";
import { Check, FlaskConical, Settings2 } from "lucide-react";
import { useFormulaRecords } from "@/hooks/useFormulaRecords";
import { useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";
import { Link } from "@/i18n/navigation";
import { SLOT_ICONS } from "@/lib/formulaSlotDefaults";

export default function FormulaWidget() {
  const t = useTranslations("Formula");
  const {
    isFormulaActive,
    timeSlots,
    formulaName,
    servingLabel,
    toggleSlot,
    isSlotCompleted,
    completedCount,
  } = useFormulaRecords();
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();
  const viewOnly = isCaregiverMode && !canEdit;

  // 포뮬러가 비활성 상태면 표시하지 않음
  if (!isFormulaActive || timeSlots.length === 0) {
    return null;
  }

  const totalSlots = timeSlots.length;
  const allDone = completedCount === totalSlots;
  const percentage = Math.round((completedCount / totalSlots) * 100);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 p-4 md:p-5 lg:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("title")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formulaName} {servingLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${
              allDone
                ? "text-green-600 dark:text-green-400"
                : "text-purple-600 dark:text-purple-400"
            }`}
          >
            {completedCount}/{totalSlots}
          </span>
          {!viewOnly && (
            <Link href="/settings#formula">
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Settings2 className="w-4 h-4" />
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* 타임슬롯 버튼 그리드 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {timeSlots.map((slot) => {
          const completed = isSlotCompleted(slot);
          const icon = SLOT_ICONS[slot] || "\u23F0";

          return (
            <button
              key={slot}
              onClick={() => toggleSlot(slot)}
              disabled={viewOnly}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl transition-all transform
                ${viewOnly ? "cursor-not-allowed opacity-60" : "active:scale-[0.97]"}
                ${
                  completed
                    ? "bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700"
                    : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                }
              `}
            >
              <span className="text-lg">{icon}</span>
              <span
                className={`text-sm font-medium flex-1 text-left ${
                  completed
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t(slot)}
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  completed
                    ? "bg-purple-500 text-white"
                    : "border-2 border-gray-300 dark:border-gray-600"
                }`}
              >
                {completed && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 진행률 바 */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            allDone ? "bg-green-500" : "bg-purple-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 완료 메시지 */}
      {allDone && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium text-center">
          {t("allDone")}
        </p>
      )}
    </div>
  );
}
