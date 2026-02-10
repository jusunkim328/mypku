"use client";

import { useState, useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import PeriodSelector, { type ChartPeriod } from "./PeriodSelector";

export default function WeeklyChartClient() {
  const t = useTranslations("WeeklyChart");
  const tChart = useTranslations("Chart");
  const tNutrients = useTranslations("Nutrients");
  const format = useFormatter();
  // dailyGoals는 Supabase 동기화 (로그인 시)
  const { dailyGoals } = useUserSettings();
  // 월간 데이터는 로컬 스토어에서 (Phase 1)
  const { getMonthlyData } = useNutritionStore();
  const { getWeeklyData, getTodayNutrition, isLoading: recordsLoading } = useMealRecords();

  const [period, setPeriod] = useState<ChartPeriod>("week");

  // 기간별 데이터 가져오기
  const chartData = useMemo(() => {
    // 데이터 로딩 중이면 빈 배열 반환
    if (recordsLoading && period !== "month") {
      return [];
    }

    if (period === "day") {
      // 오늘 데이터 - 시간대별 (간단히 전체 합계만)
      const todayNutrition = getTodayNutrition();
      return [
        {
          date: tChart("total"),
          value: todayNutrition.phenylalanine_mg || 0,
        },
      ];
    }

    if (period === "week") {
      const weeklyData = getWeeklyData();
      return weeklyData.map((day) => ({
        date: format.dateTime(new Date(day.date), { weekday: "short" }),
        value: day.nutrition.phenylalanine_mg || 0,
      }));
    }

    // month
    const now = new Date();
    const monthlyData = getMonthlyData(now.getFullYear(), now.getMonth());
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const result = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const nutrition = monthlyData[dateStr];
      result.push({
        date: String(i),
        value: nutrition ? (nutrition.phenylalanine_mg || 0) : 0,
      });
    }
    return result;
  }, [period, getWeeklyData, getMonthlyData, getTodayNutrition, format, tChart, recordsLoading]);

  // 평균 및 합계 계산
  const stats = useMemo(() => {
    const values = chartData.map((d) => d.value).filter((v) => v > 0);
    const total = values.reduce((a, b) => a + b, 0);
    const average = values.length > 0 ? total / values.length : 0;
    return { total, average };
  }, [chartData]);

  // PKU 전용: Phe 목표치
  const goalValue = dailyGoals.phenylalanine_mg || 300;
  const unit = "mg";
  const label = tNutrients("phenylalanine");

  const titleKey = period === "day" ? "dailyTitle" : period === "week" ? "weeklyTitle" : "monthlyTitle";

  return (
    <Card className="p-4 md:p-5 lg:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {tChart(titleKey as keyof IntlMessages["Chart"], { nutrient: label })}
        </h3>
        <PeriodSelector selectedPeriod={period} onPeriodChange={setPeriod} />
      </div>

      {/* 차트 */}
      <div className="h-48 md:h-56 lg:h-64 xl:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {period === "month" ? (
            // 월간은 라인 차트
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            // 일간/주간은 바 차트
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="3 3"
              />
              <Bar
                dataKey="value"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 통계 */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {t("goal")}: {goalValue}{unit}
        </span>
        {period !== "day" && (
          <span>
            {tChart("average")}: {Math.round(stats.average)}{unit}
          </span>
        )}
      </div>
    </Card>
  );
}

type IntlMessages = {
  Chart: {
    dailyTitle: string;
    weeklyTitle: string;
    monthlyTitle: string;
    average: string;
    total: string;
  };
};
