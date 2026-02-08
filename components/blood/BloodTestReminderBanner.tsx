"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { useBloodLevels } from "@/hooks/useBloodLevels";
import { showBloodTestReminder } from "@/lib/notifications";

interface BloodTestReminderBannerProps {
  compact?: boolean;
}

export default function BloodTestReminderBanner({ compact }: BloodTestReminderBannerProps) {
  const t = useTranslations("BloodTestReminder");
  const { records, settings, daysSinceLastTest, isTestOverdue } = useBloodLevels();
  const notifiedRef = useRef(false);

  const overdue = isTestOverdue;
  const elapsed = daysSinceLastTest;
  const reminderEnabled = settings.reminderIntervalDays !== null;

  // Web Notification: 기한 초과 시 세션당 1회
  useEffect(() => {
    if (!overdue || notifiedRef.current) return;

    const key = "blood-test-reminder-notified";
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;

    if (elapsed !== null) {
      showBloodTestReminder(elapsed);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(key, "1");
      }
    }
    notifiedRef.current = true;
  }, [overdue, elapsed]);

  // 기록 없음 + 리마인더 켜짐: 파란색 안내 배너
  if (records.length === 0 && reminderEnabled) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {t("noRecordsTitle")}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
            {t("noRecordsDesc")}
          </p>
          {compact && (
            <Link
              href="/blood-levels"
              className="inline-block text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              {t("goToBloodLevels")} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 기한 초과: amber 경고 배너
  if (overdue && elapsed !== null) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t("overdueTitle")}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
            {t("overdueDesc", { days: elapsed })}
          </p>
          {compact && (
            <Link
              href="/blood-levels"
              className="inline-block text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline mt-1"
            >
              {t("addRecord")} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}
