/**
 * 브라우저 알림 유틸리티
 */

export type NotificationPermissionState = "granted" | "denied" | "default";

/**
 * 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications not supported");
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * 알림 표시
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications not supported");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  new Notification(title, {
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    ...options,
  });
}

/**
 * 식사 리마인더 알림
 */
export function showMealReminder(mealType: "breakfast" | "lunch" | "dinner" | "snack"): void {
  const titles: Record<typeof mealType, string> = {
    breakfast: "Breakfast Time",
    lunch: "Lunch Time",
    dinner: "Dinner Time",
    snack: "Snack Time",
  };

  const bodies: Record<typeof mealType, string> = {
    breakfast: "Don't forget to log your breakfast!",
    lunch: "Time to record your lunch!",
    dinner: "Remember to track your dinner!",
    snack: "Log your snack to stay on track!",
  };

  showNotification(titles[mealType], {
    body: bodies[mealType],
    tag: `meal-reminder-${mealType}`,
    requireInteraction: false,
  });
}

/**
 * Phe 한도 경고 알림
 */
export function showPheWarning(currentPhe: number, limitPhe: number): void {
  const percentage = Math.round((currentPhe / limitPhe) * 100);

  if (percentage >= 100) {
    showNotification("Daily Phe Limit Reached", {
      body: `You've reached your daily limit of ${limitPhe}mg. Be careful with your next meal!`,
      tag: "phe-limit",
      requireInteraction: true,
    });
  } else if (percentage >= 80) {
    showNotification("Approaching Phe Limit", {
      body: `You're at ${percentage}% of your daily Phe limit (${currentPhe}/${limitPhe}mg)`,
      tag: "phe-warning",
      requireInteraction: false,
    });
  }
}

/**
 * 스트릭 달성 축하 알림
 */
export function showStreakCelebration(days: number): void {
  const milestones = [7, 14, 30, 60, 100];
  if (milestones.includes(days)) {
    showNotification(`${days}-Day Streak! 🎉`, {
      body: `Amazing! You've logged meals for ${days} consecutive days!`,
      tag: "streak-milestone",
      requireInteraction: false,
    });
  }
}

/**
 * 일일 목표 달성 알림
 */
export function showGoalAchievement(): void {
  showNotification("Daily Goal Achieved! ✅", {
    body: "Congratulations! You've stayed within your daily nutrition goals!",
    tag: "goal-achievement",
    requireInteraction: false,
  });
}

const SLOT_DISPLAY_NAMES: Record<string, string> = {
  morning: "Morning",
  noon: "Noon",
  evening: "Evening",
  bedtime: "Bedtime",
};

/**
 * 포뮬러 미복용 리마인더 알림
 */
export function showFormulaReminder(missedSlots: string[]): void {
  const displaySlots = missedSlots.map((slot) => SLOT_DISPLAY_NAMES[slot] ?? slot);
  showNotification("Formula Reminder", {
    body: `You have missed formula slots: ${displaySlots.join(", ")}`,
    tag: "formula-reminder",
    requireInteraction: false,
  });
}

/**
 * 혈중 Phe 검사 리마인더 알림
 */
export function showBloodTestReminder(daysSinceLastTest: number): void {
  showNotification("Blood Test Reminder", {
    body: `Your last blood Phe test was ${daysSinceLastTest} days ago. Consider scheduling a test.`,
    tag: "blood-test-reminder",
    requireInteraction: false,
  });
}

/**
 * 시간 기반 리마인더 스케줄링
 */
export function scheduleMealReminder(
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  time: string // "HH:MM" 형식
): number | null {
  if (typeof window === "undefined") return null;

  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );

  // 이미 지난 시간이면 내일로 설정
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  const timerId = window.setTimeout(() => {
    showMealReminder(mealType);
    // 다음 날 같은 시간에 다시 스케줄링
    scheduleMealReminder(mealType, time);
  }, delay);

  return timerId;
}

/**
 * 리마인더 취소
 */
export function cancelReminder(timerId: number): void {
  if (typeof window === "undefined") return;
  clearTimeout(timerId);
}
