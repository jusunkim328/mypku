"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePatientContext, useIsCaregiverMode } from "@/hooks/usePatientContext";
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
  const { getTodayNutrition, isLoading } = useMealRecords();
  const { dailyGoals } = useUserSettings();
  const activePatient = usePatientContext((s) => s.activePatient);
  const alertedRef = useRef(false);

  // 환자 전환 시 alertedRef 초기화 (다른 환자 선택 시 재알림)
  const prevPatientIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isCaregiverMode) {
      alertedRef.current = false;
      prevPatientIdRef.current = undefined;
      return;
    }
    if (prevPatientIdRef.current !== undefined && prevPatientIdRef.current !== activePatient?.id) {
      alertedRef.current = false;
    }
    prevPatientIdRef.current = activePatient?.id;
  }, [isCaregiverMode, activePatient?.id]);

  useEffect(() => {
    // 데이터 로딩 중에는 알림 발생하지 않음 (보호자 본인 데이터로 잘못 알림 방지)
    if (!isCaregiverMode || alertedRef.current || isLoading) return;

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
  }, [isCaregiverMode, isLoading, getTodayNutrition, dailyGoals.phenylalanine_mg, alertThresholdPercent, t]);

  return null;
}
