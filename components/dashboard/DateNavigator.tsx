"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const t = useTranslations("DateNavigator");
  const tCommon = useTranslations("Common");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // 오늘 날짜인지 확인
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 어제 날짜인지 확인
  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  // 날짜 포맷팅
  const formatDate = (date: Date): string => {
    if (isToday(date)) return tCommon("today");
    if (isYesterday(date)) return tCommon("yesterday");

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // 이전 날로 이동
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  // 다음 날로 이동
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  // 오늘로 이동
  const goToToday = () => {
    onDateChange(new Date());
  };

  // 날짜 선택기 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 미래 날짜 비활성화
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 p-3">
      {/* 이전 날 */}
      <button
        onClick={goToPreviousDay}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-700 dark:text-gray-300"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 현재 날짜 */}
      <div className="flex items-center gap-2" ref={datePickerRef}>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(selectedDate)}</span>
        </button>

        {!isToday(selectedDate) && (
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
          >
            {tCommon("today")}
          </button>
        )}

        {/* 날짜 선택기 드롭다운 */}
        {showDatePicker && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-2 z-50">
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isFutureDate(newDate)) {
                  onDateChange(newDate);
                  setShowDatePicker(false);
                }
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* 다음 날 */}
      <button
        onClick={goToNextDay}
        disabled={isToday(selectedDate)}
        className={`p-2 rounded-full transition-colors ${
          isToday(selectedDate)
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
