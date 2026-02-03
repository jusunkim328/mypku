"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useBadgeStore, type Badge, type BadgeStats } from "@/hooks/useBadgeStore";
import { useStreakStore } from "@/hooks/useStreakStore";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useUserSettings } from "@/hooks/useUserSettings";

interface BadgeCollectionProps {
  showAll?: boolean;
}

export default function BadgeCollection({ showAll = false }: BadgeCollectionProps) {
  const t = useTranslations("Badges");
  const { badges, checkAndUnlockBadges, getUnlockedBadges, getLockedBadges, _hasHydrated } = useBadgeStore();
  const { currentStreak, longestStreak, totalLoggingDays } = useStreakStore();
  const { mealRecords } = useMealRecords();
  const { mode } = useUserSettings();

  // 배지 달성 조건 체크
  useEffect(() => {
    if (!_hasHydrated) return;

    const stats: BadgeStats = {
      currentStreak,
      longestStreak,
      totalMeals: mealRecords.length,
      daysWithinGoal: 0, // TODO: 실제 계산 필요
      pkuModeDays: mode === "pku" ? totalLoggingDays : 0,
      barcodeScans: mealRecords.filter((r) =>
        r.items.some((i) => (i as { source?: string }).source === "barcode")
      ).length,
      voiceLogs: mealRecords.filter((r) =>
        r.items.some((i) => (i as { source?: string }).source === "voice")
      ).length,
    };

    checkAndUnlockBadges(stats);
  }, [
    _hasHydrated,
    currentStreak,
    longestStreak,
    totalLoggingDays,
    mealRecords,
    mode,
    checkAndUnlockBadges,
  ]);

  const unlockedBadges = getUnlockedBadges();
  const lockedBadges = getLockedBadges();

  const displayBadges = showAll
    ? Object.values(badges)
    : [...unlockedBadges, ...lockedBadges.slice(0, 3)];

  const BadgeCard = ({ badge }: { badge: Badge }) => {
    const isUnlocked = badge.unlockedAt !== null;

    return (
      <div
        className={`
          relative p-3 rounded-xl border-2 transition-all
          ${
            isUnlocked
              ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-300 dark:border-yellow-600"
              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
          }
        `}
      >
        {/* 배지 아이콘 */}
        <div
          className={`
            w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl
            ${isUnlocked ? "bg-yellow-100 dark:bg-yellow-800/50" : "bg-gray-200 dark:bg-gray-600 grayscale opacity-50"}
          `}
        >
          {badge.icon}
        </div>

        {/* 배지 이름 */}
        <h4
          className={`
            mt-2 text-center text-sm font-medium
            ${isUnlocked ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-400"}
          `}
        >
          {t(badge.titleKey as keyof IntlMessages["Badges"])}
        </h4>

        {/* 설명 또는 진행률 */}
        <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
          {isUnlocked
            ? t("unlocked")
            : badge.progress !== undefined
              ? `${Math.round(badge.progress)}%`
              : t("locked")}
        </p>

        {/* 진행률 바 (잠긴 배지) */}
        {!isUnlocked && badge.progress !== undefined && (
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 dark:bg-indigo-500 transition-all"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
        )}

        {/* 잠금 해제 날짜 */}
        {isUnlocked && badge.unlockedAt && (
          <p className="mt-1 text-center text-xs text-yellow-600 dark:text-yellow-400">
            {new Date(badge.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 md:p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {unlockedBadges.length}/{Object.keys(badges).length}
        </span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {displayBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      {!showAll && lockedBadges.length > 3 && (
        <p className="mt-3 text-center text-sm text-gray-400">
          +{lockedBadges.length - 3} more to unlock
        </p>
      )}
    </div>
  );
}

// Type helper
type IntlMessages = {
  Badges: {
    title: string;
    locked: string;
    unlocked: string;
    firstMeal: string;
    firstMealDesc: string;
    streak7: string;
    streak7Desc: string;
    streak30: string;
    streak30Desc: string;
    streak100: string;
    streak100Desc: string;
    goalMaster: string;
    goalMasterDesc: string;
    pkuPro: string;
    pkuProDesc: string;
  };
};
