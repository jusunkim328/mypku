"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Toggle, List, ListItem, Preloader } from "@/components/ui";
import { Sun, Monitor, Moon, User } from "lucide-react";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import type { Locale } from "@/i18n/routing";
import NotificationSettings from "@/components/settings/NotificationSettings";

const languages: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
];

// 테마 토글 컴포넌트
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("SettingsPage");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-12 h-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-3">
      {/* 라이트 모드 아이콘 */}
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-lg transition-all ${
          theme === "light"
            ? "bg-yellow-100 text-yellow-600"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-5 h-5" />
      </button>

      {/* 시스템 모드 아이콘 */}
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-lg transition-all ${
          theme === "system"
            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="System mode"
      >
        <Monitor className="w-5 h-5" />
      </button>

      {/* 다크 모드 아이콘 */}
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-lg transition-all ${
          theme === "dark"
            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function SettingsClient() {
  const t = useTranslations("SettingsPage");
  const tModes = useTranslations("Modes");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, dailyGoals, setDailyGoals, _hasHydrated, getExchanges } = useNutritionStore();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const isPKU = mode === "pku";

  // authLoading 타임아웃 (3초 후 강제로 로딩 완료 처리)
  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? "pku" : "general");
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

      <Block className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* 계정 */}
        <Card className="p-4 md:p-5 lg:p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {tAuth("account")}
          </h3>
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-12 h-12 rounded-full ring-2 ring-primary-200 dark:ring-primary-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                small
                outline
                danger
                onClick={handleLogout}
                className="w-full"
              >
                {tAuth("logout")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{tAuth("guestMode")}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tAuth("guestModeActive")}</p>
                </div>
              </div>
              <Link href="/auth/login" className="block">
                <Button small className="w-full">
                  {tAuth("login")}
                </Button>
              </Link>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {tAuth("loginForSync")}
              </p>
            </div>
          )}
        </Card>

        {/* 테마 설정 */}
        <Card className="p-4 md:p-5 lg:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t("theme") || "Theme"}
          </h3>
          <ThemeToggle />
        </Card>

        {/* 모드 설정 */}
        <Card className="p-4 md:p-5 lg:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t("appMode")}
          </h3>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
            {t("pkuModeExplain")}
          </p>
        </Card>

        {/* 알림 설정 */}
        <NotificationSettings />

        {/* 언어 설정 */}
        <Card className="p-4 md:p-5 lg:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t("language")}
          </h3>
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
        <Card className="p-4 md:p-5 lg:p-6 lg:col-span-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t("dailyGoals")}
          </h3>
          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
            {isPKU && (
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {tNutrients("phenylalanine")} (mg)
                </label>
                <input
                  type="number"
                  value={dailyGoals.phenylalanine_mg || 300}
                  onChange={(e) =>
                    setDailyGoals({
                      phenylalanine_mg: parseInt(e.target.value) || 300,
                    })
                  }
                  className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                  = {getExchanges(dailyGoals.phenylalanine_mg || 300)} {tNutrients("exchanges")} (1 {tNutrients("exchange")} = 50mg)
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {tNutrients("calories")} (kcal)
              </label>
              <input
                type="number"
                value={dailyGoals.calories}
                onChange={(e) =>
                  setDailyGoals({ calories: parseInt(e.target.value) || 2000 })
                }
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {tNutrients("protein")} (g)
              </label>
              <input
                type="number"
                value={dailyGoals.protein_g}
                onChange={(e) =>
                  setDailyGoals({ protein_g: parseInt(e.target.value) || 50 })
                }
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {tNutrients("carbs")} (g)
              </label>
              <input
                type="number"
                value={dailyGoals.carbs_g}
                onChange={(e) =>
                  setDailyGoals({ carbs_g: parseInt(e.target.value) || 250 })
                }
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {tNutrients("fat")} (g)
              </label>
              <input
                type="number"
                value={dailyGoals.fat_g}
                onChange={(e) =>
                  setDailyGoals({ fat_g: parseInt(e.target.value) || 65 })
                }
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>
        </Card>

        {/* 앱 정보 */}
        <Card className="p-4 md:p-5 lg:p-6 lg:col-span-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("appInfo")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("version")}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t("hackathon")}
          </p>
        </Card>
      </Block>
    </Page>
  );
}
