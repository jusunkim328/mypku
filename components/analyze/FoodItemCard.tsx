"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";
import type { FoodItem, PKUSafetyLevel } from "@/types/nutrition";

interface FoodItemCardProps {
  item: FoodItem;
  onUpdate: (updates: Partial<FoodItem>) => void;
}

// PKU 안전등급 배지 컴포넌트
function PKUSafetyBadge({ safety, t }: { safety: PKUSafetyLevel; t: (key: string) => string }) {
  const badgeStyles: Record<PKUSafetyLevel, string> = {
    safe: "bg-green-100 text-green-700 border-green-200",
    caution: "bg-yellow-100 text-yellow-700 border-yellow-200",
    avoid: "bg-red-100 text-red-700 border-red-200",
  };

  const icons: Record<PKUSafetyLevel, string> = {
    safe: "✓",
    caution: "⚠",
    avoid: "✕",
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeStyles[safety]}`}>
      {icons[safety]} {t(safety)}
    </span>
  );
}

export default function FoodItemCard({ item, onUpdate }: FoodItemCardProps) {
  const t = useTranslations("FoodItem");
  const tCommon = useTranslations("Common");
  const tNutrients = useTranslations("Nutrients");
  const { mode, getExchanges } = useNutritionStore();
  const isPKU = mode === "pku";

  // AI가 반환한 exchanges 사용, 없으면 계산
  const exchanges = item.exchanges ?? getExchanges(item.nutrition.phenylalanine_mg || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editWeight, setEditWeight] = useState(item.estimatedWeight_g.toString());

  const confidenceColor =
    item.confidence >= 0.8
      ? "text-green-600"
      : item.confidence >= 0.5
        ? "text-yellow-600"
        : "text-red-600";

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
    <Card className="p-3">
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder={t("foodName")}
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              placeholder={t("weight")}
            />
            <span className="text-gray-500 text-sm">g</span>
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
              <h4 className="font-medium">{item.name}</h4>
              {item.userVerified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {t("modified")}
                </span>
              )}
              {/* PKU 안전등급 배지 */}
              {isPKU && item.pkuSafety && (
                <PKUSafetyBadge safety={item.pkuSafety} t={t} />
              )}
            </div>
            <p className="text-sm text-gray-500">
              {item.estimatedWeight_g}g · {Math.round(item.nutrition.calories)}
              kcal
            </p>
            <p className={`text-xs ${confidenceColor}`}>
              {t("confidence")}: {confidenceLabel} ({Math.round(item.confidence * 100)}%)
            </p>

            {/* PKU 정보 표시 */}
            {isPKU && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {/* Phe 및 Exchange */}
                <div className="inline-block px-2 py-1 bg-indigo-100 rounded-md">
                  <span className="text-xs font-semibold text-indigo-700">
                    {item.nutrition.phenylalanine_mg}mg Phe · {exchanges} {tNutrients("exchanges")}
                  </span>
                </div>
              </div>
            )}

            {/* 대체품 추천 (caution/avoid일 때만) */}
            {showAlternatives && (
              <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  {t("alternatives")}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.alternatives!.slice(0, 3).map((alt, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white text-amber-600 px-2 py-0.5 rounded border border-amber-200"
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
