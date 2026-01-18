"use client";

import Link from "next/link";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import NutrientRing from "@/components/dashboard/NutrientRing";
import DailyGoalCard from "@/components/dashboard/DailyGoalCard";
import Disclaimer from "@/components/common/Disclaimer";

export default function HomeClient() {
  const { mode, getTodayNutrition, dailyGoals, mealRecords, _hasHydrated } = useNutritionStore();
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

  // mealRecords가 변경될 때마다 다시 계산됨
  const todayNutrition = getTodayNutrition();

  return (
    <Page>
      <Navbar
        title="MyPKU"
        subtitle={isPKU ? "PKU 모드" : "일반 모드"}
        right={
          <Link href="/settings">
            <Button clear small>
              설정
            </Button>
          </Link>
        }
      />

      <Block className="space-y-4">
        {/* 오늘의 영양소 요약 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">오늘의 섭취량</h2>
          <div className="flex justify-around">
            {isPKU ? (
              <NutrientRing
                label="페닐알라닌"
                current={todayNutrition.phenylalanine_mg || 0}
                goal={dailyGoals.phenylalanine_mg || 300}
                unit="mg"
                color="var(--pku-primary)"
                warning={true}
              />
            ) : (
              <NutrientRing
                label="칼로리"
                current={todayNutrition.calories}
                goal={dailyGoals.calories}
                unit="kcal"
                color="var(--pku-primary)"
              />
            )}
            <NutrientRing
              label="단백질"
              current={todayNutrition.protein_g}
              goal={dailyGoals.protein_g}
              unit="g"
              color="var(--pku-secondary)"
            />
            <NutrientRing
              label="탄수화물"
              current={todayNutrition.carbs_g}
              goal={dailyGoals.carbs_g}
              unit="g"
              color="var(--pku-success)"
            />
          </div>
        </Card>

        {/* 일일 목표 카드 */}
        <DailyGoalCard />

        {/* 식사 기록 버튼 */}
        <div className="flex gap-3">
          <Link href="/analyze" className="flex-1">
            <Button large className="w-full">
              음식 촬영하기
            </Button>
          </Link>
          <Link href="/history" className="flex-1">
            <Button large outline className="w-full">
              기록 보기
            </Button>
          </Link>
        </div>

        {/* 면책조항 */}
        <Disclaimer />
      </Block>
    </Page>
  );
}
