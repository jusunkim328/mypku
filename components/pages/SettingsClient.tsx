"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Toggle, List, ListItem, Preloader } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
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
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode, dailyGoals, setDailyGoals, _hasHydrated } = useNutritionStore();
  const isPKU = mode === "pku";

  const handleModeToggle = () => {
    setMode(isPKU ? "general" : "pku");
  };

  const handleLanguageChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

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
