"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";
import type { FoodItem } from "@/types/nutrition";

interface FoodItemCardProps {
  item: FoodItem;
  onUpdate: (updates: Partial<FoodItem>) => void;
}

export default function FoodItemCard({ item, onUpdate }: FoodItemCardProps) {
  const t = useTranslations("FoodItem");
  const tCommon = useTranslations("Common");
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
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{item.name}</h4>
              {item.userVerified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {t("modified")}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {item.estimatedWeight_g}g · {Math.round(item.nutrition.calories)}
              kcal
            </p>
            <p className={`text-xs ${confidenceColor}`}>
              {t("confidence")}: {confidenceLabel} ({Math.round(item.confidence * 100)}%)
            </p>
          </div>
          <Button small clear onClick={() => setIsEditing(true)}>
            {tCommon("edit")}
          </Button>
        </div>
      )}
    </Card>
  );
}
