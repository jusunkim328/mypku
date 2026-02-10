"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";

// 전체 차트 컴포넌트를 동적으로 로드 (SSR 비활성화)
const WeeklyChartClient = dynamic(
  () => import("./WeeklyChartClient"),
  {
    ssr: false,
    loading: () => <ChartLoading />,
  }
);

function ChartLoading() {
  const t = useTranslations("WeeklyChart");
  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{t("title", { nutrient: "" })}</h3>
      <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-400 dark:text-gray-500 text-sm">{t("loading")}</p>
      </div>
    </Card>
  );
}

export default function WeeklyChart() {
  return <WeeklyChartClient />;
}
