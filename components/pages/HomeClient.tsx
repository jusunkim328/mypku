"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Page, Block, Button, Card, Preloader } from "@/components/ui";
import { ScanBarcode, Database, Settings, Droplets, GraduationCap } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import type { FavoriteMeal } from "@/hooks/useFavoriteMeals";
import { useAuth } from "@/contexts/AuthContext";
import { useIsViewingOwnData, useCanEdit } from "@/hooks/usePatientContext";
import { toast } from "@/hooks/useToast";
import { showPheWarning } from "@/lib/notifications";
import NutrientRing from "@/components/dashboard/NutrientRing";
import PheRemainingCard from "@/components/dashboard/PheRemainingCard";
import DailyGoalCard from "@/components/dashboard/DailyGoalCard";
import StreakBadge from "@/components/dashboard/StreakBadge";
import WaterTracker from "@/components/dashboard/WaterTracker";
import FormulaWidget from "@/components/dashboard/FormulaWidget";
import PatientSelector from "@/components/caregiver/PatientSelector";
import PatientBanner from "@/components/caregiver/PatientBanner";
import BloodTestReminderBanner from "@/components/blood/BloodTestReminderBanner";
import FavoriteMealCard from "@/components/favorites/FavoriteMealCard";
import Disclaimer from "@/components/common/Disclaimer";

export default function HomeClient() {
  const t = useTranslations("HomePage");
  const tFav = useTranslations("Favorites");
  const tNutrients = useTranslations("Nutrients");
  const router = useRouter();
  const { dailyGoals, _hasHydrated, getExchanges, getExchangeGoal, quickSetupCompleted, onboardingCompleted, authLoading } = useUserSettings();
  const { pheWarnings, permission } = useNotificationStore();
  const { user, isAuthenticated } = useAuth();
  const { mealRecords, getTodayNutrition, addMealRecord, isLoading: recordsLoading } = useMealRecords();
  const { favorites, recordUse } = useFavoriteMeals();
  const isViewingOwnData = useIsViewingOwnData();
  const canEdit = useCanEdit();

  const lastWarningRef = useRef<number>(0);

  // 즐겨찾기 빠른 재기록
  const handleReRecord = async (fav: FavoriteMeal) => {
    await addMealRecord({
      timestamp: new Date().toISOString(),
      mealType: fav.mealType,
      imageUrl: null,
      items: fav.items,
      totalNutrition: fav.totalNutrition,
      aiConfidence: null,
    });
    await recordUse(fav.id);
    toast.success(tFav("recorded"));
  };

  // 첫 방문 시 온보딩 페이지로 리다이렉트 (보호자 모드에서는 건너뛰기)
  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated && authLoading) return; // profile 로딩 대기
    if (!quickSetupCompleted && !onboardingCompleted && isViewingOwnData) {
      router.push("/onboarding");
    }
  }, [_hasHydrated, quickSetupCompleted, onboardingCompleted, isViewingOwnData, isAuthenticated, authLoading, router]);

  // Phe 한도 경고 알림 (PKU 전용)
  useEffect(() => {
    if (!pheWarnings || permission !== "granted" || !_hasHydrated) {
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
  }, [mealRecords, pheWarnings, permission, _hasHydrated, dailyGoals.phenylalanine_mg, getTodayNutrition]);

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
      {/* 커스텀 헤더 - 왼쪽 정렬 레이아웃 */}
      <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* 왼쪽: 타이틀 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t("title")}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PKU Management
                </p>
              </div>
            </div>

            {/* 오른쪽: 환자 선택 + 프로필/설정 */}
            <div className="flex items-center gap-2">
              {isAuthenticated && <PatientSelector />}
              {!authLoading && (
                isAuthenticated ? (
                  <Link href="/settings">
                    {user?.user_metadata?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Settings"
                        className="w-9 h-9 rounded-full ring-2 ring-primary-200 dark:ring-primary-700 hover:ring-primary-400 dark:hover:ring-primary-500 transition-all cursor-pointer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 hover:from-primary-500 hover:to-primary-700 flex items-center justify-center text-white text-sm font-semibold transition-all cursor-pointer">
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </Link>
                ) : (
                  <Link href="/settings">
                    <button className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 보호자 모드 배너 */}
      <PatientBanner />

      <Block className="space-y-4">
        {/* 혈중 검사 리마인더 배너 */}
        <BloodTestReminderBanner compact />

        {/* Phe 잔여량 카드 (PKU 핵심 지표) */}
        <PheRemainingCard
          used={todayNutrition.phenylalanine_mg || 0}
          goal={dailyGoals.phenylalanine_mg || 300}
          exchangeUsed={getExchanges(todayNutrition.phenylalanine_mg || 0)}
          exchangeGoal={getExchangeGoal()}
        />

        {/* 오늘의 영양소 요약 */}
        <Card className="p-5 md:p-6 lg:p-8" elevated>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-5 md:mb-6">
            {t("todayIntake")}
          </h2>
          <div className="flex justify-around md:justify-center md:gap-8 lg:gap-12">
            {/* Phe 링 (PKU 전용) */}
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

        {/* 즐겨찾기 빠른 재기록 */}
        {favorites.length > 0 && (
          <Card className="p-4" elevated>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {tFav("title")}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {favorites.slice(0, 5).map((fav) => (
                <FavoriteMealCard
                  key={fav.id}
                  favorite={fav}
                  onReRecord={handleReRecord}
                  compact
                />
              ))}
            </div>
          </Card>
        )}

        {/* 스트릭 배지 */}
        <StreakBadge />

        {/* 배지 보기 버튼 */}
        <Link href="/profile">
          <Button outline className="w-full flex items-center justify-center gap-2">
            <span>🏆</span>
            {t("viewBadges")}
          </Button>
        </Link>

        {/* 포뮬러 섭취 추적 */}
        <FormulaWidget />

        {/* 일일 목표 카드 */}
        <DailyGoalCard />

        {/* 수분 섭취 추적 */}
        <WaterTracker />

        {/* 식사 기록 버튼 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {canEdit && (
            <>
              <Link href="/analyze" className="col-span-2 md:col-span-4">
                <Button large className="w-full">
                  {t("takePhoto")}
                </Button>
              </Link>
              <Link href="/scan" className="md:col-span-2">
                <Button large outline className="w-full flex items-center justify-center gap-2">
                  <ScanBarcode className="w-5 h-5" />
                  {t("scanBarcode")}
                </Button>
              </Link>
            </>
          )}
          <Link href="/history" className="md:col-span-2">
            <Button large outline className="w-full">
              {t("viewHistory")}
            </Button>
          </Link>
          <Link href="/blood-levels" className="md:col-span-2">
            <Button large outline className="w-full flex items-center justify-center gap-2">
              <Droplets className="w-5 h-5" />
              {t("bloodLevels")}
            </Button>
          </Link>
          <Link href="/foods" className="md:col-span-2">
            <Button large outline className="w-full flex items-center justify-center gap-2">
              <Database className="w-5 h-5" />
              {t("foodDatabase")}
            </Button>
          </Link>
          <Link href="/learn" className="col-span-2 md:col-span-4">
            <Button large outline className="w-full flex items-center justify-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t("learnAboutPku")}
            </Button>
          </Link>
        </div>

        {/* 면책조항 */}
        <Disclaimer />
      </Block>
    </Page>
  );
}
