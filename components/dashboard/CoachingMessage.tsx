"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button, Preloader } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useMealRecords } from "@/hooks/useMealRecords";

const CACHE_KEY = "mypku-coaching-cache";

interface CachedCoaching {
  message: string;
  date: string; // YYYY-MM-DD
  mode: string;
  locale: string;
}

function getCachedMessage(currentMode: string, currentLocale: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedCoaching = JSON.parse(cached);
    const today = new Date().toISOString().split("T")[0];

    // 오늘 날짜 + 같은 모드 + 같은 언어일 때만 캐시 사용
    if (data.date === today && data.mode === currentMode && data.locale === currentLocale) {
      return data.message;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedMessage(message: string, mode: string, locale: string): void {
  if (typeof window === "undefined") return;

  const data: CachedCoaching = {
    message,
    date: new Date().toISOString().split("T")[0],
    mode,
    locale,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export default function CoachingMessage() {
  const t = useTranslations("Coaching");
  const locale = useLocale();
  const { mode, dailyGoals } = useUserSettings();
  const { getWeeklyData, isLoading: recordsLoading } = useMealRecords();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasData, setHasData] = useState(false);

  // 캐시된 메시지 로드 및 데이터 확인
  useEffect(() => {
    // 데이터 로딩 중이면 대기
    if (recordsLoading) return;

    const weeklyData = getWeeklyData();
    const dataExists = weeklyData.some((day) => day.nutrition.calories > 0);
    setHasData(dataExists);

    if (dataExists) {
      const cached = getCachedMessage(mode, locale);
      if (cached) {
        setMessage(cached);
      }
    }
  }, [mode, locale, getWeeklyData, recordsLoading]);

  const fetchCoaching = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyData: getWeeklyData(),
          mode,
          dailyGoals,
          locale,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setCachedMessage(data.message, mode, locale);
      } else {
        setError(data.error || t("errorFetch"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터 로딩 중
  if (recordsLoading) {
    return (
      <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
        <div className="flex items-center justify-center py-4">
          <Preloader className="!w-6 !h-6" />
        </div>
      </Card>
    );
  }

  // 데이터가 없을 때
  if (!hasData) {
    return (
      <Card className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40">
        <div className="flex items-start gap-3">
          <div className="text-2xl opacity-50">🤖</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {t("title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {t("noDataYet")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🤖</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            {t("title")}
          </h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Preloader className="!w-4 !h-4" />
              {t("analyzing")}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
              <Button small clear onClick={fetchCoaching} className="ml-2">
                {t("retry")}
              </Button>
            </div>
          ) : message ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("promptText")}</p>
          )}
        </div>
      </div>
      <Button
        small
        outline={!message}
        clear={!!message}
        onClick={fetchCoaching}
        loading={isLoading}
        className="mt-2"
      >
        {message ? t("getNewFeedback") : t("getFeedback")}
      </Button>
    </Card>
  );
}
