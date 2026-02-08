"use client";

import { useTranslations } from "next-intl";

interface Props {
  userName: string;
  periodStart: string;
  periodEnd: string;
}

export default function ReportHeader({
  userName,
  periodStart,
  periodEnd,
}: Props) {
  const t = useTranslations("Report");
  const today = new Date().toLocaleDateString();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 print:border-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary-600">MyPKU</p>
          <p className="text-xs text-gray-400">PKU Management App</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
        {userName && (
          <p>
            <span className="font-medium">{t("patient")}:</span> {userName}
          </p>
        )}
        <p>{t("generatedAt", { date: today })}</p>
        <p className="col-span-2">
          {t("period", { start: periodStart, end: periodEnd })}
        </p>
      </div>
    </div>
  );
}
