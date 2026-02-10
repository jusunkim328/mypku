"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Card, Preloader } from "@/components/ui";
import { Droplets, Settings2, Check } from "lucide-react";
import { useBloodLevels, useBloodLevelStore, mgDlToUmol, umolToMgDl, type BloodUnit, type BloodLevelSettings } from "@/hooks/useBloodLevels";
import { useCanEdit, useIsCaregiverMode } from "@/hooks/usePatientContext";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import BloodLevelForm from "@/components/blood/BloodLevelForm";
import BloodLevelCard from "@/components/blood/BloodLevelCard";
import BloodLevelChart from "@/components/blood/BloodLevelChart";
import BloodTestReminderBanner from "@/components/blood/BloodTestReminderBanner";

export default function BloodLevelsClient() {
  const t = useTranslations("BloodLevels");
  const tCommon = useTranslations("Common");

  const {
    records,
    settings,
    isLoading,
    addRecord,
    removeRecord,
    updateSettings,
  } = useBloodLevels();

  const { _hasHydrated } = useBloodLevelStore();
  const canEdit = useCanEdit();
  const isCaregiverMode = useIsCaregiverMode();
  const viewOnly = isCaregiverMode && !canEdit;
  const { pendingIds, scheduleDelete } = useUndoDelete();
  const [showSettings, setShowSettings] = useState(false);

  // 임시 설정 상태 (저장 전까지 반영 안 됨)
  const [tempSettings, setTempSettings] = useState<BloodLevelSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // 설정 패널 열 때 현재 설정으로 초기화
  useEffect(() => {
    if (showSettings) {
      setTempSettings(settings);
      setHasChanges(false);
    }
  }, [showSettings, settings]);

  // 임시 설정 변경 핸들러
  const handleTempSettingsChange = (updates: Partial<BloodLevelSettings>) => {
    setTempSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // 저장 핸들러
  const handleSaveSettings = () => {
    updateSettings(tempSettings);
    setHasChanges(false);
    setShowSettings(false);
  };

  // 취소 핸들러
  const handleCancelSettings = () => {
    setTempSettings(settings);
    setHasChanges(false);
    setShowSettings(false);
  };

  if (!_hasHydrated || isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Preloader />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar
        title={t("title")}
        left={
          <Link href="/">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
        right={
          !viewOnly ? (
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label={t("settingsTitle")}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      <Block className="space-y-4">
        {/* 혈중 검사 리마인더 배너 */}
        <BloodTestReminderBanner />

        {/* 설정 패널 */}
        {showSettings && (
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("settingsTitle")}
            </h3>

            {/* 단위 선택 */}
            <div role="radiogroup" aria-label={t("unitLabel")}>
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                {t("unitLabel")}
              </label>
              <div className="flex gap-2">
                {(["umol", "mg_dl"] as BloodUnit[]).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => handleTempSettingsChange({ unit })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      tempSettings.unit === unit
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {unit === "umol" ? "\u00B5mol/L" : "mg/dL"}
                  </button>
                ))}
              </div>
            </div>

            {/* 목표 범위 - 현재 단위에 맞게 표시/입력 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="blood-target-min" className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  {t("targetMin")} ({tempSettings.unit === "umol" ? "\u00B5mol/L" : "mg/dL"})
                </label>
                <input
                  id="blood-target-min"
                  type="number"
                  step={tempSettings.unit === "mg_dl" ? "0.1" : "1"}
                  value={
                    tempSettings.unit === "mg_dl"
                      ? umolToMgDl(tempSettings.targetMin)
                      : tempSettings.targetMin
                  }
                  onChange={(e) => {
                    const inputVal = Number(e.target.value);
                    const umolVal = tempSettings.unit === "mg_dl" ? mgDlToUmol(inputVal) : inputVal;
                    handleTempSettingsChange({ targetMin: umolVal });
                  }}
                  onFocus={(e) => e.target.select()}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="blood-target-max" className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  {t("targetMax")} ({tempSettings.unit === "umol" ? "\u00B5mol/L" : "mg/dL"})
                </label>
                <input
                  id="blood-target-max"
                  type="number"
                  step={tempSettings.unit === "mg_dl" ? "0.1" : "1"}
                  value={
                    tempSettings.unit === "mg_dl"
                      ? umolToMgDl(tempSettings.targetMax)
                      : tempSettings.targetMax
                  }
                  onChange={(e) => {
                    const inputVal = Number(e.target.value);
                    const umolVal = tempSettings.unit === "mg_dl" ? mgDlToUmol(inputVal) : inputVal;
                    handleTempSettingsChange({ targetMax: umolVal });
                  }}
                  onFocus={(e) => e.target.select()}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("targetHint")}
            </p>

            {/* 검사 리마인더 간격 */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                {t("reminderInterval")}
              </label>
              <div className="flex flex-wrap gap-2">
                {([7, 14, 30, null] as const).map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => handleTempSettingsChange({ reminderIntervalDays: value })}
                    className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      tempSettings.reminderIntervalDays === value
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {value === null
                      ? t("intervalNever")
                      : t(`interval${value}days`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelSettings}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleSaveSettings}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  hasChanges
                    ? "bg-primary-500 text-white hover:bg-primary-600"
                    : "bg-primary-200 dark:bg-primary-800 text-primary-400 dark:text-primary-600 cursor-not-allowed"
                }`}
                disabled={!hasChanges}
              >
                <Check className="w-4 h-4" />
                {tCommon("save")}
              </button>
            </div>
          </Card>
        )}

        {/* 트렌드 차트 */}
        {records.length > 0 && (
          <BloodLevelChart
            records={records}
            settings={settings}
            displayUnit={settings.unit}
          />
        )}

        {/* 새 기록 추가 (view-only 보호자에겐 숨김) */}
        {!viewOnly && (
          <BloodLevelForm defaultUnit={settings.unit} onSubmit={addRecord} />
        )}

        {/* 기록 목록 */}
        {records.length === 0 ? (
          <Card className="p-8 text-center">
            <Droplets className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("noRecords")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("noRecordsHint")}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("history")} ({records.length})
            </h3>
            {records
              .filter((record) => !pendingIds.has(record.id))
              .map((record) => (
              <BloodLevelCard
                key={record.id}
                record={record}
                displayUnit={settings.unit}
                currentTargetMin={settings.targetMin}
                currentTargetMax={settings.targetMax}
                onDelete={removeRecord}
                viewOnly={viewOnly}
                onScheduleDelete={scheduleDelete}
              />
            ))}
          </div>
        )}
      </Block>
    </Page>
  );
}
