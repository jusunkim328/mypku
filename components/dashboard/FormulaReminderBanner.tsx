"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bell, X } from "lucide-react";
import { usePreventiveReminders } from "@/hooks/usePreventiveReminders";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { showFormulaReminder } from "@/lib/notifications";

export default function FormulaReminderBanner() {
  const t = useTranslations("PreventiveReminders");
  const tFormula = useTranslations("Formula");
  const { missedFormulaSlots, hasMissedFormula, dismissFormulaReminder } = usePreventiveReminders();
  const { permission } = useNotificationStore();
  const notifiedRef = useRef(false);

  // Web Notification: 세션당 1회
  useEffect(() => {
    if (!hasMissedFormula || notifiedRef.current) return;
    if (permission !== "granted") return;

    const key = "formula-reminder-notified";
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;

    showFormulaReminder(missedFormulaSlots);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, "1");
    }
    notifiedRef.current = true;
  }, [hasMissedFormula, missedFormulaSlots, permission]);

  if (!hasMissedFormula) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
      <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
          {t("formulaMissedTitle")}
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-300 mt-0.5">
          {t("formulaMissedDesc", { slots: missedFormulaSlots.map(slot => tFormula(slot)).join(", ") })}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Link
            href="/settings"
            className="inline-block text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            {t("takeNow")} →
          </Link>
        </div>
      </div>
      <button
        onClick={dismissFormulaReminder}
        className="p-1 text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
        aria-label={t("dismiss")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
