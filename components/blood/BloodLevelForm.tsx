"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import type { BloodUnit } from "@/hooks/useBloodLevels";

interface BloodLevelFormProps {
  defaultUnit: BloodUnit;
  onSubmit: (data: {
    collectedAt: string;
    value: number;
    unit: BloodUnit;
    notes?: string;
  }) => Promise<void>;
}

export default function BloodLevelForm({
  defaultUnit,
  onSubmit,
}: BloodLevelFormProps) {
  const t = useTranslations("BloodLevels");
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<BloodUnit>(defaultUnit);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // 설정에서 단위가 변경되면 폼의 기본 단위도 동기화
  useEffect(() => {
    setUnit(defaultUnit);
  }, [defaultUnit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    setSaving(true);
    try {
      await onSubmit({
        collectedAt: new Date(date + "T" + new Date().toTimeString().slice(0, 8)).toISOString(),
        value: numValue,
        unit,
        notes: notes.trim() || undefined,
      });
      // 폼 리셋
      setValue("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="w-4 h-4 mr-1.5" />
        {t("addRecord")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-4"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("newRecord")}
      </h3>

      {/* 수치 + 단위 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
            {t("valueLabel")}
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={unit === "umol" ? "e.g., 240" : "e.g., 3.96"}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            required
          />
        </div>
        <div className="w-32">
          <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
            {t("unitLabel")}
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as BloodUnit)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="umol">{"\u00B5mol/L"}</option>
            <option value="mg_dl">mg/dL</option>
          </select>
        </div>
      </div>

      {/* 날짜 */}
      <div>
        <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
          {t("dateLabel")}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {/* 메모 */}
      <div>
        <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
          {t("notesLabel")}
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <Button
          outline
          className="flex-1"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          {t("cancel")}
        </Button>
        <Button
          className="flex-1"
          type="submit"
          disabled={!value || saving}
          loading={saving}
        >
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
