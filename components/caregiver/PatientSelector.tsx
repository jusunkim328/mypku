"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Users, ChevronDown, Check } from "lucide-react";
import { usePatientContext, useIsCaregiverMode } from "@/hooks/usePatientContext";
import { useFamilyShare } from "@/hooks/useFamilyShare";
import type { CaregiverLink } from "@/hooks/useFamilyShare";

export default function PatientSelector() {
  const t = useTranslations("Caregiver");
  const { patients, isLoading: familyLoading } = useFamilyShare();
  const { activePatient, setActivePatient, clearActivePatient } = usePatientContext();
  const isCaregiverMode = useIsCaregiverMode();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const acceptedPatients = patients.filter((p) => p.status === "accepted");

  // activePatient가 patients 목록에서 사라지면 자동으로 "내 데이터"로 복귀
  // familyLoading 중에는 스킵 (초기 빈 배열과 "링크 삭제됨"을 구분)
  useEffect(() => {
    if (!activePatient || familyLoading) return;
    const stillLinked = acceptedPatients.some(
      (p) => p.patientProfileId === activePatient.id
    );
    if (!stillLinked) {
      clearActivePatient();
    }
  }, [activePatient, acceptedPatients, familyLoading, clearActivePatient]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // 환자가 없으면 렌더하지 않음
  if (acceptedPatients.length === 0) return null;

  const handleSelect = (link: CaregiverLink) => {
    setActivePatient(
      {
        id: link.patientProfileId,
        name: link.patientName || null,
        email: link.patientEmail || "",
      },
      link.permissions || ["view"]
    );
    setOpen(false);
  };

  const handleSelectMyData = () => {
    clearActivePatient();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isCaregiverMode
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <Users className="w-4 h-4" />
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 overflow-hidden">
          {/* 내 데이터 */}
          <button
            onClick={handleSelectMyData}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
              {t("myData")}
            </span>
            {!isCaregiverMode && (
              <Check className="w-4 h-4 text-primary-500" />
            )}
          </button>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />

          {/* 환자 목록 */}
          {acceptedPatients.map((link) => {
            const isSelected = activePatient?.id === link.patientProfileId;
            const displayName = link.patientName || link.patientEmail || t("myData");

            return (
              <button
                key={link.id}
                onClick={() => handleSelect(link)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                  {displayName}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
