"use client";

import Link from "next/link";
import { Page, Navbar, Block, Button, Card } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import WeeklyChart from "@/components/dashboard/WeeklyChart";
import CoachingMessage from "@/components/dashboard/CoachingMessage";

const mealTypeLabels: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export default function HistoryClient() {
  const { mealRecords, removeMealRecord, mode } = useNutritionStore();
  const isPKU = mode === "pku";

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
      return "오늘";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "어제";
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Page>
      <Navbar
        title="식사 기록"
        left={
          <Link href="/">
            <Button clear small>
              뒤로
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
          <h3 className="text-base font-semibold mb-3">최근 7일 기록</h3>
          {recentRecords.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">아직 기록이 없습니다.</p>
              <Link href="/analyze">
                <Button small className="mt-3">
                  첫 식사 기록하기
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
                          {mealTypeLabels[record.mealType]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {record.items.map((i) => i.name).join(", ")}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        {isPKU && (
                          <span className="text-indigo-600 font-medium">
                            Phe: {record.totalNutrition.phenylalanine_mg}mg
                          </span>
                        )}
                        <span>{Math.round(record.totalNutrition.calories)}kcal</span>
                        <span>단백질 {record.totalNutrition.protein_g.toFixed(1)}g</span>
                      </div>
                    </div>
                    <Button
                      small
                      clear
                      className="text-red-500"
                      onClick={() => {
                        if (confirm("이 기록을 삭제하시겠습니까?")) {
                          removeMealRecord(record.id);
                        }
                      }}
                    >
                      삭제
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
