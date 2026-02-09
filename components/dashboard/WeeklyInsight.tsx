"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingUp, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useFormulaRecords } from "@/hooks/useFormulaRecords";
import { useBloodLevels } from "@/hooks/useBloodLevels";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  analyzeWeeklyInsight,
  type WeeklyInsightResult,
  type AnomalyItem,
} from "@/lib/weeklyInsightEngine";

// --- Tooltip ---

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  payload: { date: string; phe: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 text-xs">
      <p className="font-medium text-gray-600 dark:text-gray-400">{data.payload.date}</p>
      <p className="font-semibold text-gray-900 dark:text-gray-100">
        {data.payload.phe} mg Phe
      </p>
    </div>
  );
}

// --- Anomaly badge ---

function AnomalyBadge({ anomaly, t }: { anomaly: AnomalyItem; t: (key: string, params?: Record<string, string | number>) => string }) {
  const Icon = anomaly.severity === "warning" ? AlertTriangle : Info;
  const color =
    anomaly.severity === "warning"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"
      : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${color}`}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{t(anomaly.messageKey, anomaly.messageParams)}</span>
    </div>
  );
}

// --- Main ---

export default function WeeklyInsight() {
  const t = useTranslations("WeeklyInsight");
  const { getWeeklyData } = useMealRecords();
  const { fetchFormulaSummary } = useFormulaRecords();
  const { records: bloodRecords } = useBloodLevels();
  const { dailyGoals } = useUserSettings();

  const [formulaSummary, setFormulaSummary] = useState<
    { date: string; completedSlots: number; totalSlots: number }[]
  >([]);
  const [expanded, setExpanded] = useState(false);
  const isDark = useDarkMode();

  // Fetch formula summary for the week
  const weeklyData = getWeeklyData();
  const datesKey = useMemo(() => weeklyData.map((d) => d.date).join(","), [weeklyData]);
  const prevDatesKeyRef = useRef<string>("");

  useEffect(() => {
    if (datesKey && datesKey !== prevDatesKeyRef.current) {
      prevDatesKeyRef.current = datesKey;
      fetchFormulaSummary(datesKey.split(",")).then(setFormulaSummary);
    }
  }, [datesKey, fetchFormulaSummary]);

  // Analyze
  const insight: WeeklyInsightResult = useMemo(
    () =>
      analyzeWeeklyInsight({
        weeklyPheData: weeklyData,
        formulaSummary,
        dailyGoals,
        bloodRecords,
      }),
    [weeklyData, formulaSummary, dailyGoals, bloodRecords]
  );

  // Chart data
  const chartData = useMemo(
    () =>
      weeklyData.map((d) => {
        const dayLabel = new Date(d.date + "T00:00:00");
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return {
          date: d.date,
          label: dayNames[dayLabel.getDay()],
          phe: d.nutrition.phenylalanine_mg,
        };
      }),
    [weeklyData]
  );

  const pheGoal = dailyGoals.phenylalanine_mg || 300;

  // Cold start
  if (insight.dataStatus === "cold_start") {
    return (
      <Card className="p-4" elevated>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("title")}
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("coldStartMessage")}
        </p>
      </Card>
    );
  }

  const { stats, anomalies } = insight;

  return (
    <Card className="p-4" elevated>
      {/* Header */}
      <button
        className="flex items-center justify-between w-full mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("title")}
          </h3>
          {insight.dataStatus === "partial" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {t("partialData")}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Stats grid (always visible) */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.avgPhe}
            <span className="text-xs font-normal text-gray-500 ml-0.5">mg</span>
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {t("avgPhe")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.goalHitDays}
            <span className="text-xs font-normal text-gray-500 ml-0.5">
              /{stats.totalDays}
            </span>
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {t("goalHitRate")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {Math.round(stats.formulaCompletionRate * 100)}
            <span className="text-xs font-normal text-gray-500 ml-0.5">%</span>
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {t("formulaRate")}
          </p>
        </div>
      </div>

      {/* Expandable chart + anomalies */}
      {expanded && (
        <>
          {/* Bar chart */}
          <div className="w-full mb-3" style={{ minHeight: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#374151" : "#e5e7eb"}
                  opacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={pheGoal}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${t("goalLine")} ${pheGoal}mg`,
                    position: "insideTopRight",
                    fill: "#ef4444",
                    fontSize: 10,
                  }}
                />
                <Bar
                  dataKey="phe"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <AnomalyBadge key={i} anomaly={a} t={t} />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
