"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import NutrientRing from "@/components/dashboard/NutrientRing";
import DailyGoalCard from "@/components/dashboard/DailyGoalCard";
import Disclaimer from "@/components/common/Disclaimer";

export default function HomeClient() {
  const t = useTranslations("HomePage");
  const tModes = useTranslations("Modes");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const { mode, getTodayNutrition, dailyGoals, mealRecords, _hasHydrated } = useNutritionStore();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(tAuth("logoutSuccess"));
    } catch {
      toast.error(tAuth("loginFailed"));
    }
  };
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

        {/* 일일 목표 카드 */}
        <DailyGoalCard />

        {/* 식사 기록 버튼 */}
        <div className="flex gap-3">
          <Link href="/analyze" className="flex-1">
            <Button large className="w-full">
              {t("takePhoto")}
            </Button>
          </Link>
          <Link href="/history" className="flex-1">
            <Button large outline className="w-full">
              {t("viewHistory")}
            </Button>
          </Link>
        </div>

        {/* 면책조항 */}
        <Disclaimer />
      </Block>
    </Page>
  );
}
