"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader, NumberInput } from "@/components/ui";
import { Sun, Monitor, Moon, User, Download, Upload, Database } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import { downloadJSON, getExportSummary } from "@/lib/dataExport";
import { openFileAndImport, openFileAndImportToSupabase } from "@/lib/dataImport";
import type { Locale } from "@/i18n/routing";
import type { DailyGoals } from "@/types/nutrition";
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

// 데이터 관리 컴포넌트
function DataManagement({ isAuthenticated, userId }: { isAuthenticated: boolean; userId?: string }) {
  const t = useTranslations("SettingsPage");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof getExportSummary>>(null);

  // 마운트 시 요약 정보 로드 (비로그인 상태에서만)
  useEffect(() => {
    if (!isAuthenticated) {
      setSummary(getExportSummary());
    }
  }, [isAuthenticated]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const success = downloadJSON();
      if (success) {
        toast.success(t("exportSuccess"));
      } else {
        toast.error(t("exportFailed"));
      }
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      let result;

      if (isAuthenticated && userId) {
        // 로그인 상태: Supabase에 직접 업로드
        result = await openFileAndImportToSupabase(userId);
      } else {
        // 비로그인 상태: localStorage에 저장
        result = await openFileAndImport({ overwrite: true });
      }

      if (result.success) {
        toast.success(
          t("importSuccess", { count: result.imported?.mealCount || 0 })
        );
        // 페이지 새로고침으로 상태 반영
        window.location.reload();
      } else if (result.error === "cancelled" || result.error === "noFileSelected") {
        // 사용자가 취소한 경우 무시
      } else if (result.error === "invalidFormat") {
        toast.error(t("importInvalidFormat"));
      } else {
        toast.error(t("importFailed"));
      }
    } catch {
      toast.error(t("importFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="p-4 md:p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("dataManagement")}
        </h3>
      </div>

      {/* 로그인 상태 안내 */}
      {isAuthenticated && (
        <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            {t("importToCloud")}
          </p>
        </div>
      )}

      {/* 데이터 요약 (비로그인 상태에서만) */}
      {!isAuthenticated && summary && summary.mealCount > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("dataSummary", {
              meals: summary.mealCount,
              days: summary.dayCount,
            })}
          </p>
          {summary.oldestDate && summary.newestDate && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {summary.oldestDate} ~ {summary.newestDate}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {/* 내보내기는 비로그인 상태에서만 */}
        {!isAuthenticated && (
          <Button
            small
            outline
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? t("exporting") : t("exportData")}
          </Button>
        )}
        <Button
          small
          outline
          onClick={handleImport}
          disabled={isImporting}
          className={!isAuthenticated ? "flex-1" : "w-full"}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          {isImporting ? t("importing") : t("importData")}
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        {isAuthenticated ? t("importToCloudDesc") : t("dataManagementDesc")}
      </p>
    </Card>
  );
}

export default function SettingsClient() {
  const t = useTranslations("SettingsPage");
  const tNutrients = useTranslations("Nutrients");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { dailyGoals, setDailyGoals, _hasHydrated, getExchanges } = useUserSettings();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();

  // authLoading 타임아웃 (3초 후 강제로 로딩 완료 처리)
  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Daily Goals 드래프트 상태 (입력 중 로컬 상태만 변경, 저장 버튼으로 DB 반영)
  const [draftGoals, setDraftGoals] = useState<DailyGoals>(dailyGoals);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // 실제 값 비교로 변경 감지 (값을 되돌리면 버튼 숨김)
  const hasGoalsChanges = useMemo(() => {
    return (
      draftGoals.calories !== dailyGoals.calories ||
      draftGoals.protein_g !== dailyGoals.protein_g ||
      draftGoals.carbs_g !== dailyGoals.carbs_g ||
      draftGoals.fat_g !== dailyGoals.fat_g ||
      draftGoals.phenylalanine_mg !== dailyGoals.phenylalanine_mg
    );
  }, [draftGoals, dailyGoals]);

  // dailyGoals가 변경되면 (로그인 시 DB 동기화 등) 드래프트도 업데이트
  useEffect(() => {
    setDraftGoals(dailyGoals);
  }, [dailyGoals]);

  // 페이지 이탈 경고 (저장하지 않은 변경사항 있을 때)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasGoalsChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasGoalsChanges]);

  // 브라우저 뒤로가기 버튼 경고
  useEffect(() => {
    if (!hasGoalsChanges) return;

    // 현재 상태를 히스토리에 푸시 (뒤로가기 감지용)
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      const confirmed = window.confirm(t("unsavedChangesWarning"));
      if (confirmed) {
        // 사용자가 확인 → 뒤로가기 허용
        window.history.back();
      } else {
        // 사용자가 취소 → 현재 페이지 유지
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasGoalsChanges, t]);

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

  // Daily Goals 저장 핸들러
  const handleSaveGoals = async () => {
    setIsSavingGoals(true);
    try {
      await setDailyGoals(draftGoals);
      toast.success(t("goalsSaved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Daily Goals 취소 핸들러
  const handleCancelGoals = () => {
    setDraftGoals(dailyGoals);
  };

  // 앱 내부 네비게이션 경고 (Link 클릭 시)
  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasGoalsChanges) {
      const confirmed = window.confirm(t("unsavedChangesWarning"));
      if (!confirmed) {
        e.preventDefault();
      }
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
          <Link href="/" onClick={handleNavigation}>
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

        {/* 알림 설정 */}
        <NotificationSettings />

        {/* 데이터 관리 */}
        <DataManagement isAuthenticated={isAuthenticated} userId={user?.id} />

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
            {/* Phe 목표 (PKU 전용) */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {tNutrients("phenylalanine")} (mg)
              </label>
              <NumberInput
                value={draftGoals.phenylalanine_mg || 300}
                onChange={(value) => setDraftGoals((prev) => ({ ...prev, phenylalanine_mg: value }))}
                min={50}
                max={1000}
                defaultValue={300}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                = {getExchanges(draftGoals.phenylalanine_mg || 300)} {tNutrients("exchanges")} (1 {tNutrients("exchange")} = 50mg)
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {tNutrients("calories")} (kcal)
              </label>
              <NumberInput
                value={draftGoals.calories}
                onChange={(value) => setDraftGoals((prev) => ({ ...prev, calories: value }))}
                min={500}
                max={5000}
                defaultValue={2000}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {tNutrients("protein")} (g)
              </label>
              <NumberInput
                value={draftGoals.protein_g}
                onChange={(value) => setDraftGoals((prev) => ({ ...prev, protein_g: value }))}
                min={10}
                max={200}
                defaultValue={50}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {tNutrients("carbs")} (g)
              </label>
              <NumberInput
                value={draftGoals.carbs_g}
                onChange={(value) => setDraftGoals((prev) => ({ ...prev, carbs_g: value }))}
                min={50}
                max={500}
                defaultValue={250}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {tNutrients("fat")} (g)
              </label>
              <NumberInput
                value={draftGoals.fat_g}
                onChange={(value) => setDraftGoals((prev) => ({ ...prev, fat_g: value }))}
                min={10}
                max={200}
                defaultValue={65}
                className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>
          {/* 저장/취소 버튼 */}
          {hasGoalsChanges && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <Button outline onClick={handleCancelGoals}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSaveGoals} disabled={isSavingGoals}>
                {isSavingGoals ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          )}
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
