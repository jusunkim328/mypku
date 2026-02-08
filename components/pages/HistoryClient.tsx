"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { ChevronDown } from "lucide-react";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";
import WeeklyChart from "@/components/dashboard/WeeklyChart";
import CoachingMessage from "@/components/dashboard/CoachingMessage";
import CalendarView from "@/components/dashboard/CalendarView";
import DateNavigator from "@/components/dashboard/DateNavigator";

export default function HistoryClient() {
  const t = useTranslations("HistoryPage");
  const tCommon = useTranslations("Common");
  const tMeals = useTranslations("MealTypes");
  const tNutrients = useTranslations("Nutrients");
  const format = useFormatter();
  const { mealRecords, removeMealRecord, isLoading } = useMealRecords();
  const { _hasHydrated } = useUserSettings();
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();
  const viewOnly = isCaregiverMode && !canEdit;

  // 날짜 선택 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // 하이드레이션 및 데이터 로딩 대기
  if (!_hasHydrated || isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

  // 선택된 날짜인지 확인하는 헬퍼 함수
  const isSameDate = (timestamp: string, targetDate: Date): boolean => {
    const date = new Date(timestamp);
    return (
      date.getDate() === targetDate.getDate() &&
      date.getMonth() === targetDate.getMonth() &&
      date.getFullYear() === targetDate.getFullYear()
    );
  };

  // 선택된 날짜의 기록 필터링
  const selectedDateRecords = mealRecords
    .filter((record) => isSameDate(record.timestamp, selectedDate))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return tCommon("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return tCommon("yesterday");
    } else {
      return format.dateTime(date, { month: "short", day: "numeric" });
    }
  };

  const formatTime = (timestamp: string) => {
    return format.dateTime(new Date(timestamp), {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMealTypeLabel = (mealType: string) => {
    const key = mealType as keyof IntlMessages["MealTypes"];
    return tMeals(key);
  };

  return (
    <Page>
      <Navbar
        title={t("title")}
        left={
          <Link href="/">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
      />

      <Block className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
        {/* 메인 컨텐츠 영역 (lg: 왼쪽 2컬럼) */}
        <div className="lg:col-span-2 space-y-4">
          {/* 날짜 네비게이터 */}
          <div className="relative">
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Toggle calendar"
            >
              <ChevronDown
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${showCalendar ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* 월간 달력 (토글) */}
          {showCalendar && (
            <CalendarView
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setShowCalendar(false);
              }}
            />
          )}

          {/* 주간 차트 */}
          <WeeklyChart />

          {/* 선택된 날짜의 식사 기록 목록 */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {formatDate(selectedDate.toISOString())} {t("recentRecords")}
            </h3>
            {selectedDateRecords.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">{t("noRecords")}</p>
                <Link href="/analyze">
                  <Button small className="mt-3">
                    {t("recordFirst")}
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-2">
                {selectedDateRecords.map((record, index) => (
                  <Card
                    key={record.id}
                    className="p-4"
                    animate={true}
                  >
                    <div
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatDate(record.timestamp)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTime(record.timestamp)}
                            </span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                              {getMealTypeLabel(record.mealType)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
                            {record.items.map((i) => i.name).join(", ")}
                          </p>
                          <div className="flex gap-3 text-xs mt-2">
                            {/* Phe 정보 (PKU 전용) */}
                            <span className="text-primary-600 dark:text-primary-400 font-semibold">
                              {t("phe")}: {record.totalNutrition.phenylalanine_mg}mg
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {Math.round(record.totalNutrition.calories)}kcal
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {tNutrients("protein")} {record.totalNutrition.protein_g.toFixed(1)}g
                            </span>
                          </div>
                        </div>
                        {!viewOnly && (
                          <Button
                            small
                            clear
                            danger
                            onClick={async () => {
                              if (confirm(t("deleteConfirm"))) {
                                await removeMealRecord(record.id);
                              }
                            }}
                          >
                            {tCommon("delete")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 영역 (lg: 오른쪽 1컬럼) */}
        <div className="lg:col-span-1 space-y-4">
          {/* AI 코칭 메시지 */}
          <CoachingMessage />
        </div>
      </Block>
    </Page>
  );
}

// Type helper for translations
type IntlMessages = {
  MealTypes: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };
};
