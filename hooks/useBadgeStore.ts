"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 배지 타입 정의
export type BadgeId =
  | "first_meal"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "goal_master"
  | "pku_pro"
  | "barcode_scanner"
  | "voice_logger";

export interface Badge {
  id: BadgeId;
  icon: string;
  titleKey: string;
  descKey: string;
  unlockedAt: string | null; // ISO date string
  progress?: number; // 0-100
  requirement: number;
}

interface BadgeStore {
  badges: Record<BadgeId, Badge>;

  // Actions
  unlockBadge: (id: BadgeId) => void;
  updateProgress: (id: BadgeId, progress: number) => void;
  checkAndUnlockBadges: (stats: BadgeStats) => BadgeId[];

  // Getters
  getUnlockedBadges: () => Badge[];
  getLockedBadges: () => Badge[];
  getBadge: (id: BadgeId) => Badge | undefined;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export interface BadgeStats {
  currentStreak: number;
  longestStreak: number;
  totalMeals: number;
  daysWithinGoal: number;
  pkuModeDays: number;
  barcodeScans: number;
  voiceLogs: number;
}

const initialBadges: Record<BadgeId, Badge> = {
  first_meal: {
    id: "first_meal",
    icon: "🍽️",
    titleKey: "firstMeal",
    descKey: "firstMealDesc",
    unlockedAt: null,
    requirement: 1,
  },
  streak_7: {
    id: "streak_7",
    icon: "🔥",
    titleKey: "streak7",
    descKey: "streak7Desc",
    unlockedAt: null,
    progress: 0,
    requirement: 7,
  },
  streak_30: {
    id: "streak_30",
    icon: "🌟",
    titleKey: "streak30",
    descKey: "streak30Desc",
    unlockedAt: null,
    progress: 0,
    requirement: 30,
  },
  streak_100: {
    id: "streak_100",
    icon: "💎",
    titleKey: "streak100",
    descKey: "streak100Desc",
    unlockedAt: null,
    progress: 0,
    requirement: 100,
  },
  goal_master: {
    id: "goal_master",
    icon: "🎯",
    titleKey: "goalMaster",
    descKey: "goalMasterDesc",
    unlockedAt: null,
    progress: 0,
    requirement: 7,
  },
  pku_pro: {
    id: "pku_pro",
    icon: "💜",
    titleKey: "pkuPro",
    descKey: "pkuProDesc",
    unlockedAt: null,
    progress: 0,
    requirement: 30,
  },
  barcode_scanner: {
    id: "barcode_scanner",
    icon: "📱",
    titleKey: "barcodeScanner",
    descKey: "barcodeScannerDesc",
    unlockedAt: null,
    requirement: 10,
  },
  voice_logger: {
    id: "voice_logger",
    icon: "🎤",
    titleKey: "voiceLogger",
    descKey: "voiceLoggerDesc",
    unlockedAt: null,
    requirement: 5,
  },
};

export const useBadgeStore = create<BadgeStore>()(
  persist(
    (set, get) => ({
      badges: initialBadges,

      unlockBadge: (id: BadgeId) => {
        const { badges } = get();
        if (badges[id].unlockedAt) return; // 이미 잠금 해제됨

        set({
          badges: {
            ...badges,
            [id]: {
              ...badges[id],
              unlockedAt: new Date().toISOString(),
              progress: 100,
            },
          },
        });
      },

      updateProgress: (id: BadgeId, progress: number) => {
        const { badges } = get();
        if (badges[id].unlockedAt) return; // 이미 잠금 해제됨

        set({
          badges: {
            ...badges,
            [id]: {
              ...badges[id],
              progress: Math.min(progress, 100),
            },
          },
        });
      },

      checkAndUnlockBadges: (stats: BadgeStats) => {
        const { badges, unlockBadge, updateProgress } = get();
        const newlyUnlocked: BadgeId[] = [];

        // 첫 식사
        if (!badges.first_meal.unlockedAt && stats.totalMeals >= 1) {
          unlockBadge("first_meal");
          newlyUnlocked.push("first_meal");
        }

        // 7일 스트릭
        if (!badges.streak_7.unlockedAt) {
          if (stats.currentStreak >= 7 || stats.longestStreak >= 7) {
            unlockBadge("streak_7");
            newlyUnlocked.push("streak_7");
          } else {
            updateProgress("streak_7", (stats.currentStreak / 7) * 100);
          }
        }

        // 30일 스트릭
        if (!badges.streak_30.unlockedAt) {
          if (stats.currentStreak >= 30 || stats.longestStreak >= 30) {
            unlockBadge("streak_30");
            newlyUnlocked.push("streak_30");
          } else {
            updateProgress("streak_30", (Math.max(stats.currentStreak, stats.longestStreak) / 30) * 100);
          }
        }

        // 100일 스트릭
        if (!badges.streak_100.unlockedAt) {
          if (stats.currentStreak >= 100 || stats.longestStreak >= 100) {
            unlockBadge("streak_100");
            newlyUnlocked.push("streak_100");
          } else {
            updateProgress("streak_100", (Math.max(stats.currentStreak, stats.longestStreak) / 100) * 100);
          }
        }

        // 목표 달성 마스터
        if (!badges.goal_master.unlockedAt) {
          if (stats.daysWithinGoal >= 7) {
            unlockBadge("goal_master");
            newlyUnlocked.push("goal_master");
          } else {
            updateProgress("goal_master", (stats.daysWithinGoal / 7) * 100);
          }
        }

        // PKU 프로
        if (!badges.pku_pro.unlockedAt) {
          if (stats.pkuModeDays >= 30) {
            unlockBadge("pku_pro");
            newlyUnlocked.push("pku_pro");
          } else {
            updateProgress("pku_pro", (stats.pkuModeDays / 30) * 100);
          }
        }

        // 바코드 스캐너
        if (!badges.barcode_scanner.unlockedAt && stats.barcodeScans >= 10) {
          unlockBadge("barcode_scanner");
          newlyUnlocked.push("barcode_scanner");
        }

        // 음성 로거
        if (!badges.voice_logger.unlockedAt && stats.voiceLogs >= 5) {
          unlockBadge("voice_logger");
          newlyUnlocked.push("voice_logger");
        }

        return newlyUnlocked;
      },

      getUnlockedBadges: () => {
        const { badges } = get();
        return Object.values(badges).filter((b) => b.unlockedAt !== null);
      },

      getLockedBadges: () => {
        const { badges } = get();
        return Object.values(badges).filter((b) => b.unlockedAt === null);
      },

      getBadge: (id: BadgeId) => {
        return get().badges[id];
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "mypku-badge-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        badges: state.badges,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
