"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import { showPheWarning } from "@/lib/notifications";
import NutrientRing from "@/components/dashboard/NutrientRing";
import DailyGoalCard from "@/components/dashboard/DailyGoalCard";
import StreakBadge from "@/components/dashboard/StreakBadge";
import WaterTracker from "@/components/dashboard/WaterTracker";
import Disclaimer from "@/components/common/Disclaimer";

export default function HomeClient() {
  const t = useTranslations("HomePage");
  const tModes = useTranslations("Modes");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const { mode, dailyGoals, _hasHydrated, getExchanges, getExchangeGoal } = useNutritionStore();
  const { pheWarnings, permission } = useNotificationStore();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const { mealRecords, getTodayNutrition, isLoading: recordsLoading } = useMealRecords();

  const lastWarningRef = useRef<number>(0);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(tAuth("logoutSuccess"));
    } catch {
      toast.error(tAuth("loginFailed"));
    }
  };
  const isPKU = mode === "pku";

  // Phe 한도 경고 알림
  useEffect(() => {
    if (!isPKU || !pheWarnings || permission !== "granted" || !_hasHydrated) {
      return;
    }

    const todayNutrition = getTodayNutrition();
    const currentPhe = todayNutrition.phenylalanine_mg || 0;
    const limitPhe = dailyGoals.phenylalanine_mg || 300;
    const percentage = Math.round((currentPhe / limitPhe) * 100);

    // 80% 또는 100% 도달 시 알림 (중복 방지)
    if (percentage >= 80 && lastWarningRef.current !== percentage) {
      showPheWarning(currentPhe, limitPhe);
      lastWarningRef.current = percentage >= 100 ? 100 : 80;
    }
  }, [mealRecords, isPKU, pheWarnings, permission, _hasHydrated, dailyGoals.phenylalanine_mg]);

  // 하이드레이션 및 데이터 로딩 대기
  if (!_hasHydrated || recordsLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

  // mealRecords가 변경될 때마다 다시 계산됨 (인증 상태에 따라 DB 또는 로컬 데이터)
  const todayNutrition = getTodayNutrition();

  return (
    <Page>
      <Navbar
        title={t("title")}
        subtitle={isPKU ? tModes("pku") : tModes("general")}
        right={
          <div className="flex items-center gap-2">
            {!authLoading && (
              isAuthenticated ? (
                <>
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <Button clear small onClick={handleLogout} className="text-red-500">
                    {tAuth("logout")}
                  </Button>
                </>
              ) : (
                <Link href="/auth/login">
                  <Button clear small>
                    {tAuth("login")}
                  </Button>
                </Link>
              )
            )}
            <Link href="/settings">
              <Button clear small>
                {tCommon("settings")}
              </Button>
            </Link>
          </div>
        }
      />

      <Block className="space-y-4">
        {/* 오늘의 영양소 요약 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">{t("todayIntake")}</h2>
          <div className="flex justify-around">
            {isPKU ? (
              <NutrientRing
                label={tNutrients("phenylalanine")}
                current={todayNutrition.phenylalanine_mg || 0}
                goal={dailyGoals.phenylalanine_mg || 300}
                unit="mg"
                color="var(--pku-primary)"
                warning={true}
                exchangeValue={getExchanges(todayNutrition.phenylalanine_mg || 0)}
                exchangeGoal={getExchangeGoal()}
              />
            ) : (
              <NutrientRing
                label={tNutrients("calories")}
                current={todayNutrition.calories}
                goal={dailyGoals.calories}
                unit="kcal"
                color="var(--pku-primary)"
              />
            )}
            <NutrientRing
              label={tNutrients("protein")}
              current={todayNutrition.protein_g}
              goal={dailyGoals.protein_g}
              unit="g"
              color="var(--pku-secondary)"
            />
            <NutrientRing
              label={tNutrients("carbs")}
              current={todayNutrition.carbs_g}
              goal={dailyGoals.carbs_g}
              unit="g"
              color="var(--pku-success)"
            />
          </div>
        </Card>

        {/* 스트릭 배지 */}
        <StreakBadge />

        {/* 배지 보기 버튼 */}
        <Link href="/profile">
          <Button outline className="w-full flex items-center justify-center gap-2">
            <span>🏆</span>
            {t("viewBadges")}
          </Button>
        </Link>

        {/* 일일 목표 카드 */}
        <DailyGoalCard />

        {/* 수분 섭취 추적 */}
        <WaterTracker />

        {/* 식사 기록 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/analyze" className="col-span-2">
            <Button large className="w-full">
              {t("takePhoto")}
            </Button>
          </Link>
          <Link href="/scan">
            <Button large outline className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {t("scanBarcode")}
            </Button>
          </Link>
          <Link href="/history">
            <Button large outline className="w-full">
              {t("viewHistory")}
            </Button>
          </Link>
          <Link href="/foods" className="col-span-2">
            <Button large outline className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t("foodDatabase")}
            </Button>
          </Link>
        </div>

        {/* 면책조항 */}
        <Disclaimer />
      </Block>
    </Page>
  );
}
