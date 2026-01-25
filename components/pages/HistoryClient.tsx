"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import WeeklyChart from "@/components/dashboard/WeeklyChart";
import CoachingMessage from "@/components/dashboard/CoachingMessage";

export default function HistoryClient() {
  const t = useTranslations("HistoryPage");
  const tCommon = useTranslations("Common");
  const tMeals = useTranslations("MealTypes");
  const tNutrients = useTranslations("Nutrients");
  const format = useFormatter();
  const { mealRecords, removeMealRecord, mode, _hasHydrated } = useNutritionStore();
  const isPKU = mode === "pku";

  // 하이드레이션 대기
  if (!_hasHydrated) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

  // 최근 7일 기록만 표시
  const recentRecords = mealRecords
    .filter((record) => {
      const recordDate = new Date(record.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return recordDate >= weekAgo;
    })
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

      <Block className="space-y-4">
        {/* AI 코칭 메시지 */}
        <CoachingMessage />

        {/* 주간 차트 */}
        <WeeklyChart />

        {/* 식사 기록 목록 */}
        <div>
          <h3 className="text-base font-semibold mb-3">{t("recentRecords")}</h3>
          {recentRecords.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">{t("noRecords")}</p>
              <Link href="/analyze">
                <Button small className="mt-3">
                  {t("recordFirst")}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <Card key={record.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDate(record.timestamp)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(record.timestamp)}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {getMealTypeLabel(record.mealType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {record.items.map((i) => i.name).join(", ")}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        {isPKU && (
                          <span className="text-indigo-600 font-medium">
                            {t("phe")}: {record.totalNutrition.phenylalanine_mg}mg
                          </span>
                        )}
                        <span>{Math.round(record.totalNutrition.calories)}kcal</span>
                        <span>{tNutrients("protein")} {record.totalNutrition.protein_g.toFixed(1)}g</span>
                      </div>
                    </div>
                    <Button
                      small
                      clear
                      className="text-red-500"
                      onClick={() => {
                        if (confirm(t("deleteConfirm"))) {
                          removeMealRecord(record.id);
                        }
                      }}
                    >
                      {tCommon("delete")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
