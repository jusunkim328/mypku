"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { usePatientContext, useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";

export default function PatientBanner() {
  const t = useTranslations("Caregiver");
  const { activePatient, clearActivePatient } = usePatientContext();
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();

  if (!isCaregiverMode || !activePatient) return null;

  const displayName = activePatient.name || activePatient.email;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 py-2 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200 truncate">
              {t("viewingPatient", { name: displayName })}
            </span>
            <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
              canEdit
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}>
              {canEdit ? (
                <><Pencil className="w-3 h-3" />{t("canEdit")}</>
              ) : (
                <><Eye className="w-3 h-3" />{t("viewOnly")}</>
              )}
            </span>
          </div>
          <button
            onClick={clearActivePatient}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToMyData")}
          </button>
        </div>
      </div>
    </div>
  );
}
