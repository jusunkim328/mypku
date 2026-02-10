import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  requestNotificationPermission,
  scheduleMealReminder,
  cancelReminder,
  type NotificationPermissionState,
} from "@/lib/notifications";

export interface MealReminderTime {
  enabled: boolean;
  time: string; // "HH:MM" 형식
}

export interface NotificationSettings {
  permission: NotificationPermissionState;
  mealReminders: {
    breakfast: MealReminderTime;
    lunch: MealReminderTime;
    dinner: MealReminderTime;
    snack: MealReminderTime;
  };
  pheWarnings: boolean;
  goalAchievements: boolean;
  streakMilestones: boolean;
  formulaMissedReminder: boolean;
  formulaMissedDelayMin: number;
}

interface NotificationStore extends NotificationSettings {
  _hasHydrated: boolean;
  _timerIds: Record<string, number>;

  // Actions
  requestPermission: () => Promise<NotificationPermissionState>;
  setMealReminderTime: (
    mealType: keyof NotificationSettings["mealReminders"],
    time: string
  ) => void;
  toggleMealReminder: (
    mealType: keyof NotificationSettings["mealReminders"],
    enabled: boolean
  ) => void;
  togglePheWarnings: (enabled: boolean) => void;
  toggleGoalAchievements: (enabled: boolean) => void;
  toggleStreakMilestones: (enabled: boolean) => void;
  toggleFormulaMissedReminder: (enabled: boolean) => void;
  setFormulaMissedDelayMin: (min: number) => void;
  initializeReminders: () => void;
  cancelAllReminders: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      permission: "default",
      mealReminders: {
        breakfast: { enabled: false, time: "08:00" },
        lunch: { enabled: false, time: "12:00" },
        dinner: { enabled: false, time: "18:00" },
        snack: { enabled: false, time: "15:00" },
      },
      pheWarnings: true,
      goalAchievements: true,
      streakMilestones: true,
      formulaMissedReminder: true,
      formulaMissedDelayMin: 30,
      _hasHydrated: false,
      _timerIds: {},

      // Request notification permission
      requestPermission: async () => {
        try {
          const permission = await requestNotificationPermission();
          set({ permission });
          return permission;
        } catch (error) {
          console.error("Failed to request notification permission:", error);
          return "denied";
        }
      },

      // Set meal reminder time
      setMealReminderTime: (mealType, time) => {
        const state = get();
        const reminder = state.mealReminders[mealType];

        set({
          mealReminders: {
            ...state.mealReminders,
            [mealType]: { ...reminder, time },
          },
        });

        // Re-schedule if enabled
        if (reminder.enabled && state.permission === "granted") {
          const oldTimerId = state._timerIds[mealType];
          if (oldTimerId) cancelReminder(oldTimerId);

          const timerId = scheduleMealReminder(mealType, time);
          if (timerId) {
            set({
              _timerIds: { ...state._timerIds, [mealType]: timerId },
            });
          }
        }
      },

      // Toggle meal reminder on/off
      toggleMealReminder: (mealType, enabled) => {
        const state = get();
        const reminder = state.mealReminders[mealType];

        set({
          mealReminders: {
            ...state.mealReminders,
            [mealType]: { ...reminder, enabled },
          },
        });

        if (enabled && state.permission === "granted") {
          // Schedule reminder
          const timerId = scheduleMealReminder(mealType, reminder.time);
          if (timerId) {
            set({
              _timerIds: { ...state._timerIds, [mealType]: timerId },
            });
          }
        } else {
          // Cancel reminder
          const timerId = state._timerIds[mealType];
          if (timerId) {
            cancelReminder(timerId);
            const newTimerIds = { ...state._timerIds };
            delete newTimerIds[mealType];
            set({ _timerIds: newTimerIds });
          }
        }
      },

      // Toggle Phe warnings
      togglePheWarnings: (enabled) => {
        set({ pheWarnings: enabled });
      },

      // Toggle goal achievements
      toggleGoalAchievements: (enabled) => {
        set({ goalAchievements: enabled });
      },

      // Toggle streak milestones
      toggleStreakMilestones: (enabled) => {
        set({ streakMilestones: enabled });
      },

      // Toggle formula missed reminder
      toggleFormulaMissedReminder: (enabled) => {
        set({ formulaMissedReminder: enabled });
      },

      // Set formula missed delay
      setFormulaMissedDelayMin: (min) => {
        set({ formulaMissedDelayMin: min });
      },

      // Initialize all reminders
      initializeReminders: () => {
        const state = get();
        if (state.permission !== "granted") return;

        // Cancel existing timers
        Object.values(state._timerIds).forEach(cancelReminder);

        const newTimerIds: Record<string, number> = {};

        // Schedule enabled reminders
        Object.entries(state.mealReminders).forEach(([mealType, reminder]) => {
          if (reminder.enabled) {
            const timerId = scheduleMealReminder(
              mealType as keyof NotificationSettings["mealReminders"],
              reminder.time
            );
            if (timerId) {
              newTimerIds[mealType] = timerId;
            }
          }
        });

        set({ _timerIds: newTimerIds });
      },

      // Cancel all reminders
      cancelAllReminders: () => {
        const state = get();
        Object.values(state._timerIds).forEach(cancelReminder);
        set({ _timerIds: {} });
      },

      // Set hydration state
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "mypku-notifications",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Initialize reminders after hydration
        if (state?.permission === "granted") {
          state.initializeReminders();
        }
      },
    }
  )
);
