"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Page, Block, Card, Preloader } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import type { FavoriteMeal } from "@/hooks/useFavoriteMeals";
import { useAuth } from "@/contexts/AuthContext";
import { useIsViewingOwnData, useCanEdit } from "@/hooks/usePatientContext";
import { useBloodLevels } from "@/hooks/useBloodLevels";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { toast } from "@/hooks/useToast";
import { showPheWarning } from "@/lib/notifications";
import TodaySummaryCard from "@/components/dashboard/TodaySummaryCard";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import StreakBadge from "@/components/dashboard/StreakBadge";
import WaterTracker from "@/components/dashboard/WaterTracker";
import FormulaWidget from "@/components/dashboard/FormulaWidget";
import PatientSelector from "@/components/caregiver/PatientSelector";
import PatientBanner from "@/components/caregiver/PatientBanner";
import BloodTestReminderBanner from "@/components/blood/BloodTestReminderBanner";
import FormulaReminderBanner from "@/components/dashboard/FormulaReminderBanner";
import FavoriteMealCard from "@/components/favorites/FavoriteMealCard";
import Disclaimer from "@/components/common/Disclaimer";
import CaregiverPheAlert from "@/components/caregiver/CaregiverPheAlert";
import dynamic from "next/dynamic";
const WeeklyInsight = dynamic(
  () => import("@/components/dashboard/WeeklyInsight"),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> }
);
// DesktopNavLinks: md+ 전용 드롭다운 네비게이션. HomeClient는 커스텀 헤더를 쓰므로
// Navbar 대신 직접 import. Navbar를 쓰는 페이지는 ui/index.tsx 통해 자동 포함.
import DesktopNavLinks from "@/components/layout/DesktopNavLinks";

export default function HomeClient() {
  const t = useTranslations("HomePage");
  const tFav = useTranslations("Favorites");
  const router = useRouter();
  const { dailyGoals, _hasHydrated, getExchanges, getExchangeGoal, quickSetupCompleted, onboardingCompleted, authLoading, formulaSettings } = useUserSettings();
  const { pheWarnings, permission } = useNotificationStore();
  const { isAuthenticated, profile } = useAuth();
  const { mealRecords, getTodayNutrition, addMealRecord, isLoading: recordsLoading } = useMealRecords();
  const { favorites, recordUse } = useFavoriteMeals();
  const isViewingOwnData = useIsViewingOwnData();
  const canEdit = useCanEdit();
  const { records: bloodRecords } = useBloodLevels();
  const { dismissed, dismiss, markFirstSeen, shouldShow } = useOnboardingChecklist();

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
    if (isAuthenticated && authLoading) return;
    if (!quickSetupCompleted && !onboardingCompleted && isViewingOwnData) {
      router.push("/onboarding");
    }
  }, [_hasHydrated, quickSetupCompleted, onboardingCompleted, isViewingOwnData, isAuthenticated, authLoading, router]);

  // Phe 한도 경고 알림
  useEffect(() => {
    if (!pheWarnings || permission !== "granted" || !_hasHydrated) return;

    const todayNutrition = getTodayNutrition();
    const currentPhe = todayNutrition.phenylalanine_mg || 0;
    const limitPhe = dailyGoals.phenylalanine_mg || 300;
    const percentage = Math.round((currentPhe / limitPhe) * 100);

    if (percentage >= 80 && lastWarningRef.current !== percentage) {
      showPheWarning(currentPhe, limitPhe);
      lastWarningRef.current = percentage >= 100 ? 100 : 80;
    }
  }, [mealRecords, pheWarnings, permission, _hasHydrated, dailyGoals.phenylalanine_mg, getTodayNutrition]);

  // OnboardingChecklist: 첫 방문 표시
  useEffect(() => {
    if (_hasHydrated) markFirstSeen();
  }, [_hasHydrated, markFirstSeen]);

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

  const todayNutrition = getTodayNutrition();
  const todayMeals = mealRecords.filter((r) => {
    const d = new Date(r.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // Onboarding checklist conditions
  const hasProfile = !!(profile?.diagnosis_age_group);
  const hasPheGoal = (dailyGoals.phenylalanine_mg ?? 0) > 0;
  const hasMealRecord = todayMeals.length > 0;
  const hasFormula = !!(formulaSettings?.isActive);
  const hasBloodLevel = bloodRecords.length > 0;
  const allCompleted = hasProfile && hasPheGoal && hasMealRecord && hasFormula && hasBloodLevel;
  const showChecklist = shouldShow(allCompleted) && !dismissed;

  return (
    <Page>
      {/* 컴팩트 헤더 */}
      <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center gap-2">
              {isAuthenticated && <PatientSelector />}
              <DesktopNavLinks />
            </div>
          </div>
        </div>
      </header>

      {/* 보호자 모드 배너 */}
      <PatientBanner />

      {/* 보호자 Phe 알림 */}
      <CaregiverPheAlert />

      <Block className="space-y-4">
        {/* 혈중 검사 리마인더 배너 */}
        <BloodTestReminderBanner compact />

        {/* 포뮬러 미복용 리마인더 배너 */}
        <FormulaReminderBanner />

        {/* 온보딩 체크리스트 */}
        {showChecklist && (
          <OnboardingChecklist
            status={{ profile: hasProfile, pheGoal: hasPheGoal, mealRecord: hasMealRecord, formula: hasFormula, bloodLevel: hasBloodLevel }}
            onDismiss={dismiss}
          />
        )}

        {/* TodaySummaryCard - 핵심 통합 카드 */}
        <TodaySummaryCard
          pheUsed={todayNutrition.phenylalanine_mg || 0}
          pheGoal={dailyGoals.phenylalanine_mg || 300}
          exchangeUsed={getExchanges(todayNutrition.phenylalanine_mg || 0)}
          exchangeGoal={getExchangeGoal()}
          calories={{ current: todayNutrition.calories, goal: dailyGoals.calories }}
          protein={{ current: todayNutrition.protein_g, goal: dailyGoals.protein_g }}
          carbs={{ current: todayNutrition.carbs_g, goal: dailyGoals.carbs_g }}
        />

        {/* 즐겨찾기 빠른 재기록 */}
        {favorites.length > 0 && canEdit && (
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

        {/* 포뮬러 섭취 추적 */}
        <FormulaWidget />

        {/* 수분 섭취 추적 (compact) */}
        <WaterTracker compact />

        {/* 주간 인사이트 */}
        <WeeklyInsight />

        {/* 스트릭 배지 (compact) */}
        <StreakBadge compact />

        {/* 면책조항 */}
        <Disclaimer />
      </Block>
    </Page>
  );
}
