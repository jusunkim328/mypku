"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Toggle, List, ListItem, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import type { Locale } from "@/i18n/routing";

const languages: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
];

export default function SettingsClient() {
  const t = useTranslations("SettingsPage");
  const tModes = useTranslations("Modes");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, dailyGoals, setDailyGoals, _hasHydrated } = useNutritionStore();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const isPKU = mode === "pku";

  // authLoading 타임아웃 (3초 후 강제로 로딩 완료 처리)
  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleModeToggle = () => {
    setMode(isPKU ? "general" : "pku");
  };

  const handleLanguageChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(tAuth("logoutSuccess"));
    } catch {
      toast.error(tAuth("loginFailed"));
    }
  };

  // 하이드레이션 대기 (authLoading은 타임아웃 적용)
  if (!_hasHydrated || (authLoading && !authTimeout)) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

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
        {/* 계정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">{tAuth("account")}</h3>
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                small
                outline
                onClick={handleLogout}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                {tAuth("logout")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{tAuth("guestMode")}</p>
                  <p className="text-xs text-gray-500">{tAuth("guestModeActive")}</p>
                </div>
              </div>
              <Link href="/auth/login" className="block">
                <Button small className="w-full">
                  {tAuth("login")}
                </Button>
              </Link>
              <p className="text-xs text-gray-400 text-center">
                {tAuth("loginForSync")}
              </p>
            </div>
          )}
        </Card>

        {/* 모드 설정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">{t("appMode")}</h3>
          <List>
            <ListItem
              title={tModes("pku")}
              subtitle={t("pkuModeDesc")}
              after={
                <Toggle
                  checked={isPKU}
                  onChange={handleModeToggle}
                />
              }
            />
          </List>
          <p className="text-xs text-gray-500 mt-2 px-1">
            {t("pkuModeExplain")}
          </p>
        </Card>

        {/* 언어 설정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">{t("language")}</h3>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                small
                outline={locale !== lang.code}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* 일일 목표 설정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">{t("dailyGoals")}</h3>
          <div className="space-y-3">
            {isPKU && (
              <div>
                <label className="text-sm text-gray-600">{tNutrients("phenylalanine")} (mg)</label>
                <input
                  type="number"
                  value={dailyGoals.phenylalanine_mg || 300}
                  onChange={(e) =>
                    setDailyGoals({
                      phenylalanine_mg: parseInt(e.target.value) || 300,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">{tNutrients("calories")} (kcal)</label>
              <input
                type="number"
                value={dailyGoals.calories}
                onChange={(e) =>
                  setDailyGoals({ calories: parseInt(e.target.value) || 2000 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{tNutrients("protein")} (g)</label>
              <input
                type="number"
                value={dailyGoals.protein_g}
                onChange={(e) =>
                  setDailyGoals({ protein_g: parseInt(e.target.value) || 50 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{tNutrients("carbs")} (g)</label>
              <input
                type="number"
                value={dailyGoals.carbs_g}
                onChange={(e) =>
                  setDailyGoals({ carbs_g: parseInt(e.target.value) || 250 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{tNutrients("fat")} (g)</label>
              <input
                type="number"
                value={dailyGoals.fat_g}
                onChange={(e) =>
                  setDailyGoals({ fat_g: parseInt(e.target.value) || 65 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </Card>

        {/* 앱 정보 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-2">{t("appInfo")}</h3>
          <p className="text-sm text-gray-600">{t("version")}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t("hackathon")}
          </p>
        </Card>
      </Block>
    </Page>
  );
}
