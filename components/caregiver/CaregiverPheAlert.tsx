"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useIsCaregiverMode } from "@/hooks/usePatientContext";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "@/hooks/useToast";

interface CaregiverPheAlertProps {
  alertThresholdPercent?: number;
}

export default function CaregiverPheAlert({
  alertThresholdPercent = 80,
}: CaregiverPheAlertProps) {
  const t = useTranslations("CaregiverAdvanced");
  const isCaregiverMode = useIsCaregiverMode();
  const { getTodayNutrition } = useMealRecords();
  const { dailyGoals } = useUserSettings();
  const alertedRef = useRef(false);

  useEffect(() => {
    if (!isCaregiverMode || alertedRef.current) return;

    const todayNutrition = getTodayNutrition();
    const currentPhe = todayNutrition.phenylalanine_mg || 0;
    const goalPhe = dailyGoals.phenylalanine_mg || 300;
    const percentage = Math.round((currentPhe / goalPhe) * 100);

    if (percentage >= alertThresholdPercent) {
      const messageKey = percentage > 100 ? "pheAlertOver" : "pheAlertMessage";
      const overPercent = percentage - 100;
      toast.warning(
        t(messageKey, {
          percent: percentage,
          overPercent,
          current: currentPhe,
          goal: goalPhe,
        })
      );
      alertedRef.current = true;
    }
  }, [isCaregiverMode, getTodayNutrition, dailyGoals.phenylalanine_mg, alertThresholdPercent, t]);

  return null;
}
