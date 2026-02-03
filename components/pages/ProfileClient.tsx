"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import BadgeCollection from "@/components/profile/BadgeCollection";
import StreakBadge from "@/components/dashboard/StreakBadge";

export default function ProfileClient() {
  const t = useTranslations("ProfilePage");
  const tCommon = useTranslations("Common");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">{tCommon("back")}</span>
            </button>
          </Link>
          <h1 className="text-xl font-bold flex-1 text-gray-900 dark:text-gray-100">{t("title")}</h1>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* 스트릭 배지 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t("streakSection")}</h2>
          <StreakBadge compact={false} />
        </section>

        {/* 배지 컬렉션 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t("achievementsSection")}</h2>
          <BadgeCollection />
        </section>
      </main>
    </div>
  );
}
