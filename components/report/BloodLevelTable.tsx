"use client";

import { useTranslations } from "next-intl";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";

interface Props {
  records: BloodLevelRecord[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export default function BloodLevelTable({ records }: Props) {
  const t = useTranslations("Report");

  if (records.length === 0) return null;

  const getStatus = (
    rec: BloodLevelRecord
  ): { label: string; className: string } => {
    if (rec.normalizedUmol < rec.targetMin) {
      return {
        label: t("belowRange"),
        className: "text-blue-600 dark:text-blue-400",
      };
    }
    if (rec.normalizedUmol > rec.targetMax) {
      return {
        label: t("aboveRange"),
        className: "text-red-600 dark:text-red-400",
      };
    }
    return {
      label: t("inRange"),
      className: "text-green-600 dark:text-green-400",
    };
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {t("bloodLevels")}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-600 print:border-black">
              <th className="text-left py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                {t("date")}
              </th>
              <th className="text-right py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                {t("value")} (umol/L)
              </th>
              <th className="text-left py-2 px-1 font-medium text-gray-600 dark:text-gray-400">
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const status = getStatus(rec);
              return (
                <tr
                  key={rec.id}
                  className="border-b border-gray-100 dark:border-gray-800 print:border-gray-300"
                >
                  <td className="py-1.5 px-1 text-gray-700 dark:text-gray-300">
                    {rec.collectedAt.split("T")[0]}
                  </td>
                  <td className="py-1.5 px-1 text-right font-medium text-gray-900 dark:text-gray-100">
                    {round1(rec.normalizedUmol)}
                  </td>
                  <td className={`py-1.5 px-1 font-medium ${status.className}`}>
                    {status.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
