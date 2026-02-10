"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button } from "@/components/ui";
import { GraduationCap } from "lucide-react";
import WhatIsPKU from "@/components/learn/WhatIsPKU";
import FirstWeekChecklist from "@/components/learn/FirstWeekChecklist";
import FAQ from "@/components/learn/FAQ";
import LongTermHealth from "@/components/learn/LongTermHealth";

export default function LearnClient() {
  const t = useTranslations("Learn");
  const tCommon = useTranslations("Common");

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
        {/* 헤더 카드 */}
        <div className="text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("pageTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("pageSubtitle")}
          </p>
        </div>

        {/* PKU 기초 */}
        <WhatIsPKU />

        {/* 첫 주 체크리스트 */}
        <FirstWeekChecklist />

        {/* 장기 건강 관리 */}
        <LongTermHealth />

        {/* FAQ */}
        <FAQ />

        {/* 면책조항 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">
            {t("disclaimer")}
          </p>
          <p>{t("disclaimerContent")}</p>
        </div>
      </Block>
    </Page>
  );
}
