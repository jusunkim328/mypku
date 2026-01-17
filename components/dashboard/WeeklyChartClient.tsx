"use client";

import { Card } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useNutritionStore } from "@/hooks/useNutritionStore";

export default function WeeklyChartClient() {
  const { mode, getWeeklyData, dailyGoals } = useNutritionStore();
  const isPKU = mode === "pku";
  const weeklyData = getWeeklyData();

  const chartData = weeklyData.map((day) => ({
    date: new Date(day.date).toLocaleDateString("ko-KR", { weekday: "short" }),
    value: isPKU
      ? day.nutrition.phenylalanine_mg || 0
      : day.nutrition.calories,
  }));

  const goalValue = isPKU
    ? dailyGoals.phenylalanine_mg || 300
    : dailyGoals.calories;

  const unit = isPKU ? "mg" : "kcal";
  const label = isPKU ? "페닐알라닌" : "칼로리";

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold mb-3">주간 {label} 섭취량</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              width={40}
            />
            <ReferenceLine
              y={goalValue}
              stroke="#ef4444"
              strokeDasharray="3 3"
            />
            <Bar
              dataKey="value"
              fill={isPKU ? "#6366f1" : "#3b82f6"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        목표: {goalValue}{unit}
      </p>
    </Card>
  );
}
