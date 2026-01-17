"use client";

import { useState, useEffect } from "react";
import { Card, Button, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";

export default function CoachingMessage() {
  const { mode, getWeeklyData, dailyGoals } = useNutritionStore();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

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
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
      } else {
        setError(data.error || "코칭 메시지를 가져올 수 없습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 자동으로 코칭 메시지 가져오기
  useEffect(() => {
    // 기록이 있을 때만 코칭 메시지 요청
    const weeklyData = getWeeklyData();
    const hasData = weeklyData.some((day) => day.nutrition.calories > 0);
    if (hasData && !message) {
      fetchCoaching();
    }
  }, []);

  if (!message && !isLoading && !error) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🤖</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-indigo-900 mb-1">
            AI 코치 피드백
          </h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Preloader className="!w-4 !h-4" />
              분석 중...
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error}
              <Button small clear onClick={fetchCoaching} className="ml-2">
                다시 시도
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          )}
        </div>
      </div>
      {message && !isLoading && (
        <Button small clear onClick={fetchCoaching} className="mt-2">
          새 피드백 받기
        </Button>
      )}
    </Card>
  );
}
