"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { NutritionData } from "@/types/nutrition";

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export default function CalendarView({ onDateSelect, selectedDate }: CalendarViewProps) {
  const t = useTranslations("Calendar");
  const tCommon = useTranslations("Common");
  const { mode, dailyGoals, getMonthlyData } = useNutritionStore();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = selectedDate || new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const isPKU = mode === "pku";
  const goalValue = isPKU
    ? dailyGoals.phenylalanine_mg || 300
    : dailyGoals.calories;

  // 월간 데이터 가져오기
  const monthlyData = useMemo(
    () => getMonthlyData(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth, getMonthlyData]
  );

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 해당 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력 시작 요일 (0 = 일요일)
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // 이전 달의 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 해당 월의 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // 히트맵 색상 계산 (0-100% 기준)
  const getHeatmapColor = (nutrition: NutritionData | undefined): string => {
    if (!nutrition) return "bg-gray-100";

    const value = isPKU
      ? nutrition.phenylalanine_mg || 0
      : nutrition.calories;
    const percentage = (value / goalValue) * 100;

    if (percentage === 0) return "bg-gray-100";
    if (percentage <= 25) return "bg-green-100";
    if (percentage <= 50) return "bg-green-200";
    if (percentage <= 75) return "bg-green-300";
    if (percentage <= 100) return "bg-green-400";
    if (percentage <= 125) return "bg-yellow-300";
    return "bg-red-300"; // 초과
  };

  // 날짜가 오늘인지 확인
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 날짜가 선택된 날짜인지 확인
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 오늘로 이동
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect?.(today);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t("previousMonth")}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
          >
            {tCommon("today")}
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t("nextMonth")}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateKey = date.toISOString().split("T")[0];
          const nutrition = monthlyData[dateKey];
          const heatmapColor = getHeatmapColor(nutrition);
          const today = isToday(date);
          const selected = isSelected(date);

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect?.(date)}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center
                transition-all text-sm relative
                ${heatmapColor}
                ${today ? "ring-2 ring-indigo-500" : ""}
                ${selected ? "ring-2 ring-indigo-700 bg-indigo-50" : ""}
                hover:opacity-80
              `}
            >
              <span className={`font-medium ${today ? "text-indigo-700" : ""}`}>
                {date.getDate()}
              </span>
              {nutrition && (
                <span className="text-[10px] text-gray-600">
                  {isPKU
                    ? `${Math.round(nutrition.phenylalanine_mg || 0)}`
                    : `${Math.round(nutrition.calories)}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <span>{t("less")}</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <div className="w-4 h-4 rounded bg-green-100" />
          <div className="w-4 h-4 rounded bg-green-200" />
          <div className="w-4 h-4 rounded bg-green-300" />
          <div className="w-4 h-4 rounded bg-green-400" />
          <div className="w-4 h-4 rounded bg-yellow-300" />
          <div className="w-4 h-4 rounded bg-red-300" />
        </div>
        <span>{t("more")}</span>
      </div>
    </div>
  );
}
