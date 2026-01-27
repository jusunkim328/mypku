"use client";

import { useTranslations } from "next-intl";

export type ChartPeriod = "day" | "week" | "month";

interface PeriodSelectorProps {
  selectedPeriod: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}

export default function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  const t = useTranslations("Chart");

  const periods: { value: ChartPeriod; labelKey: string }[] = [
    { value: "day", labelKey: "day" },
    { value: "week", labelKey: "week" },
    { value: "month", labelKey: "month" },
  ];

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {periods.map(({ value, labelKey }) => (
        <button
          key={value}
          onClick={() => onPeriodChange(value)}
          className={`
            flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors
            ${
              selectedPeriod === value
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }
          `}
        >
          {t(labelKey as keyof IntlMessages["Chart"])}
        </button>
      ))}
    </div>
  );
}

type IntlMessages = {
  Chart: {
    day: string;
    week: string;
    month: string;
  };
};
