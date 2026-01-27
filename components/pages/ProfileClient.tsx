"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BadgeCollection from "@/components/profile/BadgeCollection";
import StreakBadge from "@/components/dashboard/StreakBadge";

export default function ProfileClient() {
  const t = useTranslations("ProfilePage");
  const tCommon = useTranslations("Common");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">{tCommon("back")}</span>
            </button>
          </Link>
          <h1 className="text-xl font-bold flex-1">{t("title")}</h1>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 스트릭 배지 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("streakSection")}</h2>
          <StreakBadge compact={false} />
        </section>

        {/* 배지 컬렉션 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("achievementsSection")}</h2>
          <BadgeCollection />
        </section>
      </main>
    </div>
  );
}
