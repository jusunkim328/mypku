"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { AlertCircle, BarChart3 } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import {
  analyzeCorrelation,
  type CorrelationResult,
} from "@/lib/correlationAnalysis";
import type { BloodLevelRecord } from "@/hooks/useBloodLevels";
import type { MealRecord } from "@/types/nutrition";

interface PheCorrelationChartProps {
  bloodRecords: BloodLevelRecord[];
  mealRecords: MealRecord[];
}

// Tooltip
interface TooltipPayloadItem {
  payload: { dietaryPhe: number; bloodPhe: number; date: string };
}

function CorrelationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 text-xs">
      <p className="font-medium text-gray-600 dark:text-gray-400">{d.date}</p>
      <p>
        <span className="text-gray-500">Diet Phe:</span>{" "}
        <span className="font-semibold">{d.dietaryPhe} mg/day</span>
      </p>
      <p>
        <span className="text-gray-500">Blood Phe:</span>{" "}
        <span className="font-semibold">{d.bloodPhe} umol/L</span>
      </p>
    </div>
  );
}

// Interpretation badge color
function getInterpretationColor(key: string): string {
  switch (key) {
    case "strong_positive":
    case "strong_negative":
      return "text-red-600 dark:text-red-400";
    case "moderate":
      return "text-amber-600 dark:text-amber-400";
    case "weak":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export default function PheCorrelationChart({
  bloodRecords,
  mealRecords,
}: PheCorrelationChartProps) {
  const t = useTranslations("Correlation");
  const isDark = useDarkMode();

  const result: CorrelationResult = useMemo(
    () => analyzeCorrelation({ bloodRecords, mealRecords }),
    [bloodRecords, mealRecords]
  );

  // Regression line data for chart
  const regressionLineData = useMemo(() => {
    if (!result.regressionLine || result.dataPoints.length === 0) return null;
    const xs = result.dataPoints.map((d) => d.dietaryPhe);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const { slope, intercept } = result.regressionLine;
    return [
      { x: minX, y: Math.round((slope * minX + intercept) * 10) / 10 },
      { x: maxX, y: Math.round((slope * maxX + intercept) * 10) / 10 },
    ];
  }, [result]);

  // Insufficient data
  if (result.isInsufficient) {
    return (
      <div className="py-8 text-center">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("insufficient")}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t("insufficientHint", { current: result.sampleSize, needed: 5 })}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats row */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 dark:text-gray-400">
            {t("sampleSize")}: <strong>{result.sampleSize}</strong>
          </span>
          {result.pearsonR !== null && (
            <span className="text-gray-500 dark:text-gray-400">
              {t("rValue")}:{" "}
              <strong className={getInterpretationColor(result.interpretationKey)}>
                {result.pearsonR}
              </strong>
            </span>
          )}
        </div>
        <span
          className={`font-medium ${getInterpretationColor(result.interpretationKey)}`}
        >
          {t(result.interpretationKey)}
        </span>
      </div>

      {/* Scatter chart */}
      <div className="w-full" style={{ minHeight: 250 }}>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#374151" : "#e5e7eb"}
              opacity={0.5}
            />
            <XAxis
              type="number"
              dataKey="dietaryPhe"
              name="Diet Phe (mg/day)"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              label={{
                value: "Diet Phe (mg/day)",
                position: "insideBottom",
                offset: -2,
                style: { fontSize: 10, fill: "#9ca3af" },
              }}
            />
            <YAxis
              type="number"
              dataKey="bloodPhe"
              name="Blood Phe (umol/L)"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Blood Phe (umol/L)",
                angle: -90,
                position: "insideLeft",
                offset: 15,
                style: { fontSize: 10, fill: "#9ca3af" },
              }}
            />
            <Tooltip content={<CorrelationTooltip />} />
            <Scatter
              data={result.dataPoints}
              fill="#6366f1"
              fillOpacity={0.8}
            />

            {/* Trend line */}
            {regressionLineData && (
              <ReferenceLine
                segment={regressionLineData.map((p) => ({ x: p.x, y: p.y }))}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{t("correlationNote")}</span>
      </div>
    </div>
  );
}
