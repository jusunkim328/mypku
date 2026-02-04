"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertTriangle, X, CheckCircle2, Database, Bot, Keyboard, Mic } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { FoodItem, PKUSafetyLevel, DataSource, ConfidenceLevel } from "@/types/nutrition";

interface FoodItemCardProps {
  item: FoodItem;
  onUpdate: (updates: Partial<FoodItem>) => void;
  onConfirm?: (id: string) => void;
  showConfirmButton?: boolean;
}

// PKU 안전등급 아이콘 컴포넌트
function SafetyIcon({ safety }: { safety: PKUSafetyLevel }) {
  if (safety === "safe") {
    return <Check className="w-3.5 h-3.5" strokeWidth={2.5} />;
  }
  if (safety === "caution") {
    return <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />;
  }
  return <X className="w-3.5 h-3.5" strokeWidth={2.5} />;
}

// PKU 안전등급 배지 컴포넌트
function PKUSafetyBadge({ safety, t }: { safety: PKUSafetyLevel; t: (key: string) => string }) {
  const badgeClasses: Record<PKUSafetyLevel, string> = {
    safe: "badge-safe",
    caution: "badge-caution animate-pulse",
    avoid: "badge-avoid",
  };

  return (
    <span className={badgeClasses[safety]}>
      <SafetyIcon safety={safety} />
      {t(safety)}
    </span>
  );
}

// 데이터 출처 아이콘 컴포넌트
function SourceIcon({ source }: { source: DataSource }) {
  const iconClass = "w-3 h-3";
  switch (source) {
    case "ai":
      return <Bot className={iconClass} />;
    case "barcode":
      return <Database className={iconClass} />;
    case "manual":
    case "usda":
    case "kfda":
      return <Database className={iconClass} />;
    case "voice":
      return <Mic className={iconClass} />;
    default:
      return <Bot className={iconClass} />;
  }
}

// 데이터 출처 배지 컴포넌트
function SourceBadge({ source, t }: { source: DataSource; t: (key: string) => string }) {
  const sourceColors: Record<DataSource, string> = {
    ai: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    barcode: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    manual: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    usda: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
    kfda: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700",
    voice: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sourceColors[source]}`}>
      <SourceIcon source={source} />
      {t(`source_${source}`)}
    </span>
  );
}

// 신뢰도 레벨 배지 컴포넌트
function ConfidenceBadge({ level, t }: { level: ConfidenceLevel; t: (key: string) => string }) {
  const levelColors: Record<ConfidenceLevel, string> = {
    high: "text-green-600 dark:text-green-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-red-600 dark:text-red-400",
  };

  return (
    <span className={`text-xs ${levelColors[level]}`}>
      {t("confidence")}: {t(level)}
    </span>
  );
}

export default function FoodItemCard({ item, onUpdate, onConfirm, showConfirmButton = true }: FoodItemCardProps) {
  const t = useTranslations("FoodItem");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");
  const { getExchanges } = useUserSettings();

  // AI가 반환한 exchanges 사용, 없으면 계산
  const exchanges = item.exchanges ?? getExchanges(item.nutrition.phenylalanine_mg || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editWeight, setEditWeight] = useState(item.estimatedWeight_g.toString());

  // 신뢰도 레벨 결정 (AI가 반환한 값 우선, 없으면 계산)
  const confidenceLevel: ConfidenceLevel = item.confidenceLevel ??
    (item.confidence >= 0.8 ? "high" : item.confidence >= 0.5 ? "medium" : "low");

  // 데이터 출처 (기본값: ai)
  const source: DataSource = item.source ?? "ai";

  // 확정 여부
  const isConfirmed = item.isConfirmed ?? false;

  const handleSave = () => {
    onUpdate({
      name: editName,
      estimatedWeight_g: parseFloat(editWeight) || item.estimatedWeight_g,
      userVerified: true,
    });
    setIsEditing(false);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(item.id);
    }
    onUpdate({
      isConfirmed: true,
    });
  };

  // 대체품 표시 여부 (caution 또는 avoid일 때 - PKU 전용)
  const showAlternatives = item.pkuSafety && item.pkuSafety !== "safe" && item.alternatives && item.alternatives.length > 0;

  return (
    <Card className="p-4 hover-lift">
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            placeholder={t("foodName")}
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder={t("weight")}
            />
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">g</span>
          </div>
          <div className="flex gap-2">
            <Button small onClick={handleSave}>
              {tCommon("save")}
            </Button>
            <Button small outline onClick={() => setIsEditing(false)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h4>
              {/* 확정 배지 */}
              {isConfirmed && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("confirmed")}
                </span>
              )}
              {item.userVerified && !isConfirmed && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {t("modified")}
                </span>
              )}
              {/* PKU 안전등급 배지 */}
              {item.pkuSafety && (
                <PKUSafetyBadge safety={item.pkuSafety} t={t} />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {item.estimatedWeight_g}g · {Math.round(item.nutrition.calories)} kcal
            </p>
            {/* 신뢰도 + 출처 표시 */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <ConfidenceBadge level={confidenceLevel} t={t} />
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <SourceBadge source={source} t={t} />
            </div>

            {/* PKU 정보 표시 */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Phe 및 Exchange */}
              <div className="inline-block px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-700">
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                  {item.nutrition.phenylalanine_mg}mg Phe · {exchanges} {tNutrients("exchanges")}
                </span>
              </div>
            </div>

            {/* 대체품 추천 (caution/avoid일 때만) */}
            {showAlternatives && (
              <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                  {t("alternatives")}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.alternatives!.slice(0, 3).map((alt, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-600 font-medium"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {/* 확정 버튼 (미확정 상태일 때만 표시) */}
            {showConfirmButton && !isConfirmed && (
              <Button
                small
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {t("confirmThis")}
              </Button>
            )}
            <Button small clear onClick={() => setIsEditing(true)}>
              {tCommon("edit")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
