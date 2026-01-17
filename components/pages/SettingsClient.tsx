"use client";

import Link from "next/link";
import { Page, Navbar, Block, Button, Card, Toggle, List, ListItem } from "@/components/ui";
import { useNutritionStore } from "@/hooks/useNutritionStore";

export default function SettingsClient() {
  const { mode, setMode, dailyGoals, setDailyGoals } = useNutritionStore();
  const isPKU = mode === "pku";

  const handleModeToggle = () => {
    setMode(isPKU ? "general" : "pku");
  };

  return (
    <Page>
      <Navbar
        title="설정"
        left={
          <Link href="/">
            <Button clear small>
              뒤로
            </Button>
          </Link>
        }
      />

      <Block className="space-y-4">
        {/* 모드 설정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">앱 모드</h3>
          <List>
            <ListItem
              title="PKU 모드"
              subtitle="페닐알라닌 추적 활성화"
              after={
                <Toggle
                  checked={isPKU}
                  onChange={handleModeToggle}
                />
              }
            />
          </List>
          <p className="text-xs text-gray-500 mt-2 px-1">
            PKU 모드에서는 페닐알라닌 섭취량을 우선 표시하고, 일일 목표를 300mg으로 설정합니다.
          </p>
        </Card>

        {/* 일일 목표 설정 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">일일 목표</h3>
          <div className="space-y-3">
            {isPKU && (
              <div>
                <label className="text-sm text-gray-600">페닐알라닌 (mg)</label>
                <input
                  type="number"
                  value={dailyGoals.phenylalanine_mg || 300}
                  onChange={(e) =>
                    setDailyGoals({
                      phenylalanine_mg: parseInt(e.target.value) || 300,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">칼로리 (kcal)</label>
              <input
                type="number"
                value={dailyGoals.calories}
                onChange={(e) =>
                  setDailyGoals({ calories: parseInt(e.target.value) || 2000 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">단백질 (g)</label>
              <input
                type="number"
                value={dailyGoals.protein_g}
                onChange={(e) =>
                  setDailyGoals({ protein_g: parseInt(e.target.value) || 50 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">탄수화물 (g)</label>
              <input
                type="number"
                value={dailyGoals.carbs_g}
                onChange={(e) =>
                  setDailyGoals({ carbs_g: parseInt(e.target.value) || 250 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">지방 (g)</label>
              <input
                type="number"
                value={dailyGoals.fat_g}
                onChange={(e) =>
                  setDailyGoals({ fat_g: parseInt(e.target.value) || 65 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </Card>

        {/* 앱 정보 */}
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-2">앱 정보</h3>
          <p className="text-sm text-gray-600">MyPKU v0.1.0</p>
          <p className="text-xs text-gray-400 mt-1">
            Gemini 3 해커톤 프로젝트
          </p>
        </Card>
      </Block>
    </Page>
  );
}
