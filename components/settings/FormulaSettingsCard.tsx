"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical } from "lucide-react";
import { Card, Button, NumberInput, Input } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useIsCaregiverMode, useCanEdit, usePatientContext } from "@/hooks/usePatientContext";
import { toast } from "@/hooks/useToast";

const ALL_SLOTS = ["morning", "noon", "evening", "bedtime"] as const;

const sortedSlots = (slots: string[]): string[] =>
  [...slots].sort((a, b) => ALL_SLOTS.indexOf(a as typeof ALL_SLOTS[number]) - ALL_SLOTS.indexOf(b as typeof ALL_SLOTS[number]));

interface FormulaSettingsCardProps {
  onChangesStateChange: (hasChanges: boolean) => void;
}

export default function FormulaSettingsCard({ onChangesStateChange }: FormulaSettingsCardProps) {
  const t = useTranslations("SettingsPage");
  const tFormula = useTranslations("Formula");
  const tCommon = useTranslations("Common");
  const { formulaSettings, setFormulaSettings } = useUserSettings();
  const isCaregiverMode = useIsCaregiverMode();
  const canEdit = useCanEdit();
  const activePatient = usePatientContext((s) => s.activePatient);

  const [draftFormula, setDraftFormula] = useState(formulaSettings);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // formulaSettings 외부 변경 시 드래프트 동기화
  useEffect(() => {
    setDraftFormula(formulaSettings);
  }, [formulaSettings]);

  // 변경 감지 (timeSlots는 정렬 후 비교)
  const hasChanges = useMemo(() => {
    if (!draftFormula && !formulaSettings) return false;
    if (!draftFormula || !formulaSettings) return true;
    return (
      draftFormula.formulaName !== formulaSettings.formulaName ||
      draftFormula.servingAmount !== formulaSettings.servingAmount ||
      draftFormula.servingUnit !== formulaSettings.servingUnit ||
      draftFormula.isActive !== formulaSettings.isActive ||
      JSON.stringify(sortedSlots(draftFormula.timeSlots)) !== JSON.stringify(sortedSlots(formulaSettings.timeSlots))
    );
  }, [draftFormula, formulaSettings]);

  // 부모에 변경 상태 전달
  useEffect(() => {
    onChangesStateChange(hasChanges);
  }, [hasChanges, onChangesStateChange]);

  const handleSave = async () => {
    if (!draftFormula) return;
    setIsSaving(true);
    try {
      await setFormulaSettings(draftFormula);
      if (isCaregiverMode && activePatient) {
        toast.success(t("patientFormulaSaved", { name: activePatient.name || activePatient.email }));
      } else {
        toast.success(t("formulaSaved"));
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftFormula(formulaSettings);
    setShowDisableConfirm(false);
  };

  const handleToggleActive = () => {
    if (!draftFormula) return;
    if (draftFormula.isActive) {
      // 비활성화 시 인라인 확인
      setShowDisableConfirm(true);
    } else {
      setDraftFormula({ ...draftFormula, isActive: true });
      setShowDisableConfirm(false);
    }
  };

  const confirmDisable = () => {
    if (!draftFormula) return;
    setDraftFormula({ ...draftFormula, isActive: false });
    setShowDisableConfirm(false);
  };

  return (
    <Card id="formula" className="p-4 md:p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("formulaSettings")}
        </h3>
      </div>

      {!draftFormula ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {isCaregiverMode ? t("patientFormulaNotConfigured") : t("formulaNotConfigured")}
          </p>
          <Button
            small
            outline
            onClick={() =>
              setDraftFormula({
                formulaName: "PKU Formula",
                servingAmount: 200,
                servingUnit: "ml",
                timeSlots: ["morning", "noon", "evening", "bedtime"],
                isActive: true,
              })
            }
          >
            {t("setupFormula")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 활성/비활성 토글 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {draftFormula.isActive ? tFormula("active") : tFormula("inactive")}
            </span>
            <button
              onClick={handleToggleActive}
              disabled={!canEdit}
              role="switch"
              aria-checked={draftFormula.isActive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                draftFormula.isActive
                  ? "bg-purple-600"
                  : "bg-gray-300 dark:bg-gray-600"
              } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  draftFormula.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 인라인 비활성화 확인 */}
          {showDisableConfirm && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                {t("formulaDisableConfirm")}
              </p>
              <div className="flex gap-2">
                <Button small outline onClick={() => setShowDisableConfirm(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button small danger onClick={confirmDisable}>
                  {tCommon("confirm")}
                </Button>
              </div>
            </div>
          )}

          {draftFormula.isActive && (
            <>
              {/* 포뮬러 이름 */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {tFormula("formulaName")}
                </label>
                <Input
                  value={draftFormula.formulaName}
                  onChange={(e) =>
                    setDraftFormula({ ...draftFormula, formulaName: e.target.value })
                  }
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                  className="mt-1.5"
                />
              </div>

              {/* 1회 섭취량 */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {tFormula("servingAmount")}
                </label>
                <NumberInput
                  value={draftFormula.servingAmount}
                  onChange={(value) =>
                    setDraftFormula({ ...draftFormula, servingAmount: value })
                  }
                  min={1}
                  max={1000}
                  defaultValue={200}
                  disabled={!canEdit}
                  className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {/* 단위 선택 */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {tFormula("servingUnit")}
                </label>
                <div className="flex gap-2 mt-1.5">
                  {(["ml", "g", "scoop"] as const).map((unit) => (
                    <Button
                      key={unit}
                      small
                      outline={draftFormula.servingUnit !== unit}
                      disabled={!canEdit}
                      onClick={() =>
                        setDraftFormula({ ...draftFormula, servingUnit: unit })
                      }
                      className={draftFormula.servingUnit === unit ? "!bg-purple-600 !border-purple-600 !text-white" : ""}
                    >
                      {unit}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 복용 시간대 */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {tFormula("timeSlots")}
                </label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {ALL_SLOTS.map((slot) => {
                    const isSelected = draftFormula.timeSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        disabled={!canEdit}
                        onClick={() => {
                          const newSlots = isSelected
                            ? draftFormula.timeSlots.filter((s) => s !== slot)
                            : [...draftFormula.timeSlots, slot];
                          if (newSlots.length > 0) {
                            setDraftFormula({ ...draftFormula, timeSlots: newSlots });
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${!canEdit ? "opacity-50 cursor-not-allowed " : ""}${
                          isSelected
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                        }`}
                      >
                        {tFormula(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* 저장/취소 버튼 */}
          {hasChanges && canEdit && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <Button outline onClick={handleCancel}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
