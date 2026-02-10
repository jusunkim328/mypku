"use client";

import { useMemo, useCallback } from "react";
import { create } from "zustand";
import { useFormulaRecords } from "./useFormulaRecords";
import { useBloodLevels } from "./useBloodLevels";
import { useNotificationStore } from "./useNotificationStore";
import { getSlotTime } from "@/lib/formulaSlotDefaults";

// 오늘만 dismiss 상태 관리 (persist 안 함 — 새 세션마다 리셋)
interface FormulaDismissState {
  dismissedDate: string | null;
  dismiss: () => void;
  isDismissed: () => boolean;
}

export const useFormulaDismissStore = create<FormulaDismissState>((set, get) => ({
  dismissedDate: null,
  dismiss: () => {
    set({ dismissedDate: new Date().toISOString().split("T")[0] });
  },
  isDismissed: () => {
    const today = new Date().toISOString().split("T")[0];
    return get().dismissedDate === today;
  },
}));

export interface UsePreventiveRemindersReturn {
  missedFormulaSlots: string[];
  hasMissedFormula: boolean;
  daysUntilBloodTest: number | null;
  shouldShowBloodTestPreReminder: boolean;
  dismissFormulaReminder: () => void;
}

export function usePreventiveReminders(): UsePreventiveRemindersReturn {
  const { timeSlots, isSlotCompleted, isFormulaActive, slotTimesMap } = useFormulaRecords();
  const { daysUntilNextTest } = useBloodLevels();
  const { formulaMissedReminder, formulaMissedDelayMin } = useNotificationStore();
  const isDismissed = useFormulaDismissStore((s) => s.isDismissed());
  const dismiss = useFormulaDismissStore((s) => s.dismiss);

  const missedFormulaSlots = useMemo(() => {
    if (!isFormulaActive || !formulaMissedReminder || isDismissed) return [];

    const now = new Date();
    const nowMs = now.getTime();
    return timeSlots.filter((slot) => {
      const timeStr = getSlotTime(slot, slotTimesMap);
      const [hours, minutes] = timeStr.split(":").map(Number);
      const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      const elapsed = nowMs - slotTime.getTime();
      return elapsed > formulaMissedDelayMin * 60 * 1000 && !isSlotCompleted(slot);
    });
  }, [isFormulaActive, formulaMissedReminder, isDismissed, timeSlots, formulaMissedDelayMin, isSlotCompleted, slotTimesMap]);

  const hasMissedFormula = missedFormulaSlots.length > 0;

  const shouldShowBloodTestPreReminder = useMemo(() => {
    if (daysUntilNextTest === null) return false;
    return daysUntilNextTest > 0 && daysUntilNextTest <= 7;
  }, [daysUntilNextTest]);

  const dismissFormulaReminder = useCallback(() => {
    dismiss();
  }, [dismiss]);

  return {
    missedFormulaSlots,
    hasMissedFormula,
    daysUntilBloodTest: daysUntilNextTest,
    shouldShowBloodTestPreReminder,
    dismissFormulaReminder,
  };
}
