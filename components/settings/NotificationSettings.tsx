"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Toggle, Button } from "@/components/ui";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { getNotificationPermission } from "@/lib/notifications";
import { toast } from "@/hooks/useToast";

export default function NotificationSettings() {
  const t = useTranslations("NotificationSettings");
  const tCommon = useTranslations("Common");
  const tMealTypes = useTranslations("MealTypes");

  const {
    permission,
    mealReminders,
    pheWarnings,
    goalAchievements,
    streakMilestones,
    requestPermission,
    setMealReminderTime,
    toggleMealReminder,
    togglePheWarnings,
    toggleGoalAchievements,
    toggleStreakMilestones,
    _hasHydrated,
  } = useNotificationStore();

  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== "undefined" && !("Notification" in window)) {
      setIsSupported(false);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (result === "granted") {
        toast.success(t("permissionGranted"));
      } else if (result === "denied") {
        toast.error(t("permissionDenied"));
      }
    } catch (error) {
      toast.error(t("permissionError"));
    }
  };

  if (!_hasHydrated) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500">{tCommon("loading")}</div>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">{t("title")}</h3>
        <p className="text-sm text-gray-500">{t("notSupported")}</p>
      </Card>
    );
  }

  const isGranted = permission === "granted";

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold mb-3">{t("title")}</h3>

      {/* Permission Status */}
      {permission === "default" && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 mb-2">{t("enablePrompt")}</p>
          <Button small onClick={handleRequestPermission}>
            {t("enableNotifications")}
          </Button>
        </div>
      )}

      {permission === "denied" && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-900">{t("permissionDeniedMessage")}</p>
        </div>
      )}

      {permission === "granted" && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-900">✓ {t("notificationsEnabled")}</p>
        </div>
      )}

      {/* Meal Reminders */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-semibold text-gray-700">{t("mealReminders")}</h4>

        {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealType) => {
          const reminder = mealReminders[mealType];
          return (
            <div
              key={mealType}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {tMealTypes(mealType)}
                  </span>
                  <Toggle
                    checked={reminder.enabled && isGranted}
                    onChange={(checked) => toggleMealReminder(mealType, checked)}
                    disabled={!isGranted}
                  />
                </div>
                {reminder.enabled && isGranted && (
                  <input
                    type="time"
                    value={reminder.time}
                    onChange={(e) => setMealReminderTime(mealType, e.target.value)}
                    className="text-xs px-2 py-1 border rounded"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Other Notifications */}
      <div className="space-y-3 border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700">{t("otherNotifications")}</h4>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">{t("pheWarnings")}</p>
            <p className="text-xs text-gray-500">{t("pheWarningsDesc")}</p>
          </div>
          <Toggle
            checked={pheWarnings && isGranted}
            onChange={togglePheWarnings}
            disabled={!isGranted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">{t("goalAchievements")}</p>
            <p className="text-xs text-gray-500">{t("goalAchievementsDesc")}</p>
          </div>
          <Toggle
            checked={goalAchievements && isGranted}
            onChange={toggleGoalAchievements}
            disabled={!isGranted}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">{t("streakMilestones")}</p>
            <p className="text-xs text-gray-500">{t("streakMilestonesDesc")}</p>
          </div>
          <Toggle
            checked={streakMilestones && isGranted}
            onChange={toggleStreakMilestones}
            disabled={!isGranted}
          />
        </div>
      </div>
    </Card>
  );
}
