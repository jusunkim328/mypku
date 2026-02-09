"use client";

import { useTranslations, useLocale } from "next-intl";
import { Mic, MicOff, Video, VideoOff, Radio } from "lucide-react";
import { Card, Button } from "@/components/ui";
import FoodItemCard from "@/components/analyze/FoodItemCard";
import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import type { FoodItem, NutritionData } from "@/types/nutrition";

interface LiveAnalysisProps {
  onSave: (items: FoodItem[], totalNutrition: NutritionData) => void;
}

export default function LiveAnalysis({ onSave }: LiveAnalysisProps) {
  const t = useTranslations("LiveAnalysis");
  const tNutrients = useTranslations("Nutrients");
  const locale = useLocale();

  const {
    status,
    foods,
    messages,
    totalNutrition,
    isMicOn,
    isCameraOn,
    timeRemaining,
    error,
    extractError,
    sessionExpired,
    videoRef,
    canvasRef,
    connect,
    disconnect,
    toggleMic,
    updateFood,
  } = useLiveAnalysis(locale);

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // 브라우저 지원 체크
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  if (!isSupported) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("unsupported")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 카메라 프리뷰 */}
      <Card className="relative overflow-hidden bg-black rounded-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full aspect-video object-cover ${
            isCameraOn ? "" : "hidden"
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isCameraOn && status === "idle" && (
          <div className="flex flex-col items-center justify-center aspect-video text-gray-400">
            <Video className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t("noFoodsYet")}</p>
          </div>
        )}

        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">{t("connecting")}</p>
            </div>
          </div>
        )}

        {/* 오버레이: 상태 바 */}
        {status === "connected" && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            {/* LIVE 배지 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
              <Radio className="w-3 h-3" />
              {t("liveLabel")}
            </span>
            {/* 타이머 */}
            <span className="px-2.5 py-1 bg-black/60 text-white text-xs font-mono rounded-full">
              {timeStr}
            </span>
          </div>
        )}

        {/* 하단 컨트롤 바 */}
        {status === "connected" && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMicOn
                  ? "bg-white text-gray-900 shadow-lg"
                  : "bg-white/20 text-white"
              }`}
              aria-label={isMicOn ? t("stopMic") : t("startMic")}
            >
              {isMicOn ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={disconnect}
              className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg"
              aria-label={t("stopCamera")}
            >
              <VideoOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </Card>

      {/* 연결 상태 메시지 */}
      {status === "connected" && (
        <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
          {t("connected")}
        </p>
      )}

      {/* 추출 중 */}
      {status === "extracting" && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
            {t("extracting")}
          </p>
        </div>
      )}

      {/* 연결 에러 */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/30">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* 추출 에러 */}
      {extractError && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
          <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
            {t(`extractError_${extractError}`)}
          </p>
        </Card>
      )}

      {/* 시작/재시작 버튼 */}
      {(status === "idle" || status === "error") && (
        <Button
          large
          onClick={connect}
          className="w-full"
        >
          {foods.length > 0 ? t("restart") : t("startCamera")}
        </Button>
      )}

      {/* 감지된 음식 수 */}
      {foods.length > 0 && (
        <p className="text-sm text-center text-indigo-600 dark:text-indigo-400 font-medium">
          {t("foodDetected", { count: foods.length })}
        </p>
      )}

      {/* 실시간 감지된 FoodItem 카드 */}
      {foods.length > 0 && (
        <div className="space-y-3">
          {foods.map((food) => (
            <FoodItemCard
              key={food.id}
              item={food}
              onUpdate={(updates) => updateFood(food.id, updates)}
              showConfirmButton={false}
            />
          ))}
        </div>
      )}

      {/* 총 영양소 요약 */}
      {foods.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {tNutrients("phenylalanine")}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {Math.round(totalNutrition.phenylalanine_mg || 0)}mg
              </p>
              <p className="text-xs text-gray-500">Phe</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {Math.round(totalNutrition.calories)}
              </p>
              <p className="text-xs text-gray-500">{tNutrients("calories")}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {totalNutrition.protein_g.toFixed(1)}g
              </p>
              <p className="text-xs text-gray-500">{tNutrients("protein")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* 대화 로그 — 내부 추출용으로만 사용, UI에 표시하지 않음 */}

      {/* 세션 만료 알림 */}
      {sessionExpired && foods.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
          <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
            {t("sessionLimit")}
          </p>
        </Card>
      )}

      {/* 저장 버튼 */}
      {foods.length > 0 && status !== "connected" && (
        <Button
          large
          onClick={() => onSave(foods, totalNutrition)}
          className="w-full"
        >
          {t("save")}
        </Button>
      )}
    </div>
  );
}
