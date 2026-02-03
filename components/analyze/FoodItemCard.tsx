"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertTriangle, X } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import type { FoodItem, PKUSafetyLevel } from "@/types/nutrition";

interface FoodItemCardProps {
  item: FoodItem;
  onUpdate: (updates: Partial<FoodItem>) => void;
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

export default function FoodItemCard({ item, onUpdate }: FoodItemCardProps) {
  const t = useTranslations("FoodItem");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");
  const { mode, getExchanges } = useUserSettings();
  const isPKU = mode === "pku";

  // AI가 반환한 exchanges 사용, 없으면 계산
  const exchanges = item.exchanges ?? getExchanges(item.nutrition.phenylalanine_mg || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editWeight, setEditWeight] = useState(item.estimatedWeight_g.toString());

  const confidenceColor =
    item.confidence >= 0.8
      ? "text-green-600 dark:text-green-400"
      : item.confidence >= 0.5
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const confidenceLabel =
    item.confidence >= 0.8
      ? t("high")
      : item.confidence >= 0.5
        ? t("medium")
        : t("low");

  const handleSave = () => {
    onUpdate({
      name: editName,
      estimatedWeight_g: parseFloat(editWeight) || item.estimatedWeight_g,
    });
    setIsEditing(false);
  };

  // 대체품 표시 여부 (caution 또는 avoid일 때)
  const showAlternatives = isPKU && item.pkuSafety && item.pkuSafety !== "safe" && item.alternatives && item.alternatives.length > 0;

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
              {item.userVerified && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {t("modified")}
                </span>
              )}
              {/* PKU 안전등급 배지 */}
              {isPKU && item.pkuSafety && (
                <PKUSafetyBadge safety={item.pkuSafety} t={t} />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {item.estimatedWeight_g}g · {Math.round(item.nutrition.calories)} kcal
            </p>
            <p className={`text-xs ${confidenceColor} mt-0.5`}>
              {t("confidence")}: {confidenceLabel} ({Math.round(item.confidence * 100)}%)
            </p>

            {/* PKU 정보 표시 */}
            {isPKU && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {/* Phe 및 Exchange */}
                <div className="inline-block px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-700">
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                    {item.nutrition.phenylalanine_mg}mg Phe · {exchanges} {tNutrients("exchanges")}
                  </span>
                </div>
              </div>
            )}

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
          <Button small clear onClick={() => setIsEditing(true)}>
            {tCommon("edit")}
          </Button>
        </div>
      )}
    </Card>
  );
}
