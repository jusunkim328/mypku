"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { BloodLevelRecord, BloodLevelSettings } from "@/hooks/useBloodLevels";
import { umolToMgDl, type BloodUnit } from "@/hooks/useBloodLevels";
import type { NutritionData } from "@/types/nutrition";

// --- Types ---

type PeriodDays = 7 | 14 | 30 | 90;
type ViewMode = "blood" | "intake" | "both";

interface DailyIntakeData {
  date: string; // YYYY-MM-DD
  nutrition: NutritionData;
}

interface BloodLevelChartProps {
  records: BloodLevelRecord[];
  settings: BloodLevelSettings;
  displayUnit?: BloodUnit;
  /** Daily Phe intake data for overlay (optional) */
  dailyIntakeData?: DailyIntakeData[];
}

// --- Helpers ---

const PERIOD_OPTIONS: { days: PeriodDays; label: string }[] = [
  { days: 7, label: "7D" },
  { days: 14, label: "14D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
];

const STATUS_COLORS = {
  normal: "#22c55e", // green-500
  low: "#3b82f6",    // blue-500
  high: "#ef4444",   // red-500
};

const INTAKE_COLOR = "#f59e0b"; // amber-500
const MA_COLOR = "#8b5cf6";     // violet-500

function getStatus(value: number, min: number, max: number): "low" | "normal" | "high" {
  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

/** Convert a value to display unit */
function toDisplay(umolValue: number, unit: BloodUnit): number {
  return unit === "mg_dl" ? umolToMgDl(umolValue) : Math.round(umolValue * 10) / 10;
}

/** Calculate 7-day simple moving average */
function calcMovingAverage(
  sortedData: { date: string; value: number | null }[],
  window = 7
): (number | null)[] {
  return sortedData.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = sortedData.slice(start, i + 1).filter((d) => d.value !== null);
    if (slice.length === 0) return null;
    const sum = slice.reduce((acc, d) => acc + (d.value ?? 0), 0);
    return Math.round((sum / slice.length) * 10) / 10;
  });
}

// --- Custom Dot ---

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { status?: string };
}

function StatusDot({ cx, cy, payload }: CustomDotProps) {
  if (cx == null || cy == null || !payload?.status) return null;
  const color = STATUS_COLORS[payload.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.normal;
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
}

// --- Custom Tooltip ---

interface TooltipPayloadItem {
  name: string;
  value: number | null;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unitLabel: string;
}

function ChartTooltip({ active, payload, label, unitLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>
      {payload.map((entry) => {
        if (entry.value == null) return null;
        let unit = "";
        if (entry.dataKey === "bloodLevel" || entry.dataKey === "movingAvg") {
          unit = ` ${unitLabel}`;
        } else if (entry.dataKey === "dailyPhe") {
          unit = " mg";
        }
        return (
          <div key={entry.dataKey} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {entry.value}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---

export default function BloodLevelChart({
  records,
  settings,
  displayUnit = "umol",
  dailyIntakeData = [],
}: BloodLevelChartProps) {
  const t = useTranslations("BloodLevels");
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [viewMode, setViewMode] = useState<ViewMode>(dailyIntakeData.length > 0 ? "both" : "blood");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark") || mq.matches);
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", update);
    return () => { obs.disconnect(); mq.removeEventListener("change", update); };
  }, []);

  const unitLabel = displayUnit === "mg_dl" ? "mg/dL" : "\u00B5mol/L";
  const targetMinDisplay = toDisplay(settings.targetMin, displayUnit);
  const targetMaxDisplay = toDisplay(settings.targetMax, displayUnit);

  // Build chart data — 실제 데이터가 있는 날짜만 포함 (희소 데이터 효율)
  const chartData = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - period + 1);
    start.setHours(0, 0, 0, 0);
    const startTime = start.getTime();
    const endTime = now.getTime();

    // 기간 내 실제 데이터가 있는 날짜만 수집
    const dataDateSet = new Set<string>();

    for (const r of records) {
      const d = new Date(r.collectedAt);
      if (d.getTime() >= startTime && d.getTime() <= endTime) {
        dataDateSet.add(d.toISOString().split("T")[0]);
      }
    }
    for (const d of dailyIntakeData) {
      const dt = new Date(d.date + "T00:00:00");
      if (dt.getTime() >= startTime && dt.getTime() <= endTime) {
        dataDateSet.add(d.date);
      }
    }

    const dates = Array.from(dataDateSet).sort();
    if (dates.length === 0) return [];

    // Index blood records by date (기간 내 날짜만)
    const bloodByDate: Record<string, BloodLevelRecord[]> = {};
    for (const r of records) {
      const d = new Date(r.collectedAt).toISOString().split("T")[0];
      if (!dataDateSet.has(d)) continue;
      if (!bloodByDate[d]) bloodByDate[d] = [];
      bloodByDate[d].push(r);
    }

    // Index intake data by date (기간 내 날짜만)
    const intakeByDate: Record<string, number> = {};
    for (const d of dailyIntakeData) {
      if (!dataDateSet.has(d.date)) continue;
      intakeByDate[d.date] = d.nutrition.phenylalanine_mg;
    }

    // Build per-date data: use latest blood record per day if multiple
    const raw = dates.map((date) => {
      const dayRecords = bloodByDate[date];
      let bloodLevel: number | null = null;
      let status: string | null = null;

      if (dayRecords && dayRecords.length > 0) {
        const sorted = [...dayRecords].sort(
          (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
        );
        const latest = sorted[0];
        bloodLevel = toDisplay(latest.normalizedUmol, displayUnit);
        status = getStatus(latest.normalizedUmol, settings.targetMin, settings.targetMax);
      }

      return {
        date,
        dateLabel: formatDateLabel(date, period),
        bloodLevel,
        status,
        dailyPhe: intakeByDate[date] ?? null,
      };
    });

    // Calculate moving average
    const maValues = calcMovingAverage(
      raw.map((d) => ({ date: d.date, value: d.bloodLevel })),
      7
    );

    return raw.map((d, i) => ({
      ...d,
      movingAvg: maValues[i],
    }));
  }, [records, settings, displayUnit, period, dailyIntakeData]);

  // Check if we have any blood data
  const hasBloodData = chartData.some((d) => d.bloodLevel !== null);
  const hasIntakeData = chartData.some((d) => d.dailyPhe !== null);

  // No data state
  if (!hasBloodData && !hasIntakeData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("chartTitle")}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
          <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">{t("noChartData")}</p>
          <p className="text-xs mt-1">
            {t("noChartDataHint")}
          </p>
        </div>
      </div>
    );
  }

  const showBlood = viewMode === "blood" || viewMode === "both";
  const showIntake = (viewMode === "intake" || viewMode === "both") && hasIntakeData;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("chartTitle")}
          </h3>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-3">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setPeriod(opt.days)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              period === opt.days
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* View mode tabs (only if intake data exists) */}
      {hasIntakeData && (
        <div className="flex gap-1 mb-4">
          {(
            [
              { mode: "blood" as ViewMode, label: t("viewBloodLevel") },
              { mode: "intake" as ViewMode, label: t("viewDailyIntake") },
              { mode: "both" as ViewMode, label: t("viewBoth") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setViewMode(opt.mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === opt.mode
                  ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="w-full" style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} opacity={0.5} />

            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              interval="preserveStartEnd"
            />

            {/* Left Y axis: Blood level */}
            {showBlood && (
              <YAxis
                yAxisId="blood"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                label={{
                  value: unitLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 20,
                  style: { fontSize: 10, fill: "#9ca3af" },
                }}
              />
            )}

            {/* Right Y axis: Phe intake (mg) */}
            {showIntake && (
              <YAxis
                yAxisId="intake"
                orientation="right"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={[0, "auto"]}
                label={{
                  value: "Phe (mg)",
                  angle: 90,
                  position: "insideRight",
                  offset: 20,
                  style: { fontSize: 10, fill: "#9ca3af" },
                }}
              />
            )}

            <Tooltip content={<ChartTooltip unitLabel={unitLabel} />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: 11 }}
            />

            {/* Target range band */}
            {showBlood && (
              <ReferenceArea
                yAxisId="blood"
                y1={targetMinDisplay}
                y2={targetMaxDisplay}
                fill="#22c55e"
                fillOpacity={isDark ? 0.15 : 0.08}
                stroke="#22c55e"
                strokeOpacity={isDark ? 0.4 : 0.2}
                strokeDasharray="4 4"
              />
            )}

            {/* Blood level line */}
            {showBlood && (
              <Line
                yAxisId="blood"
                type="monotone"
                dataKey="bloodLevel"
                name={t("bloodPheLine")}
                stroke="#6366f1"
                strokeWidth={2}
                connectNulls
                dot={<StatusDot />}
                activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2, fill: "white" }}
              />
            )}

            {/* Moving average line */}
            {showBlood && (
              <Line
                yAxisId="blood"
                type="monotone"
                dataKey="movingAvg"
                name={t("movingAvgLine")}
                stroke={MA_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            )}

            {/* Daily Phe intake line */}
            {showIntake && (
              <Line
                yAxisId="intake"
                type="monotone"
                dataKey="dailyPhe"
                name={t("dailyPheLine")}
                stroke={INTAKE_COLOR}
                strokeWidth={2}
                connectNulls
                dot={{ r: 3, fill: INTAKE_COLOR, stroke: "white", strokeWidth: 1 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend hints */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {showBlood && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {t("inRangeLegend")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              {t("belowRangeLegend")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {t("aboveRangeLegend")}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-4 h-0.5 inline-block"
                style={{
                  background: `repeating-linear-gradient(90deg, ${MA_COLOR} 0, ${MA_COLOR} 4px, transparent 4px, transparent 8px)`,
                }}
              />
              {t("movingAvgLegend")}
            </span>
          </>
        )}
        {showBlood && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-green-500/10 border border-green-500/30 inline-block" />
            Target: {targetMinDisplay}–{targetMaxDisplay} {unitLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Format helpers ---

function formatDateLabel(dateStr: string, period: PeriodDays): string {
  const d = new Date(dateStr + "T00:00:00");
  if (period <= 14) {
    // Show "Mon 1/6" style
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${dayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }
  // Show "Jan 6" style
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}
