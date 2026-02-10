"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import {
  Camera,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Quote,
  X,
  RotateCcw,
  ShieldAlert,
  Edit3,
} from "lucide-react";
import type { DiagnosisOCRResult } from "@/lib/diagnosisOcr";

interface DiagnosisOCRProps {
  onValuesExtracted: (values: {
    phenylalanine_mg?: number;
    blood_phe_target_min?: number;
    blood_phe_target_max?: number;
    blood_phe_unit?: "umol/L" | "mg/dL";
    exchange_unit_mg?: number;
  }) => void;
  onFallbackToManual: () => void;
}

type OCRStatus = "idle" | "preview" | "uploading" | "success" | "error";

export default function DiagnosisOCR({
  onValuesExtracted,
  onFallbackToManual,
}: DiagnosisOCRProps) {
  const t = useTranslations("DiagnosisOCR");
  const [status, setStatus] = useState<OCRStatus>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisOCRResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 이미지 파일만 허용
      if (!file.type.startsWith("image/")) {
        setErrorMessage(t("imageTypeError"));
        setStatus("error");
        return;
      }

      // 10MB 제한
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(t("imageSizeError"));
        setStatus("error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
        setStatus("preview");
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);

      // 파일 입력 리셋 (같은 파일 재선택 가능)
      e.target.value = "";
    },
    [t]
  );

  const handleUpload = useCallback(async () => {
    if (!preview) return;

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/diagnosis-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: preview }),
      });

      const data = await response.json();

      // 전송 후 preview 상태에서 이미지 제거 (개인정보 보호)
      setPreview(null);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process document");
      }

      const ocrResult: DiagnosisOCRResult = data.data;
      setResult(ocrResult);

      // 아무 값도 추출하지 못한 경우
      const hasAnyValue =
        ocrResult.phenylalanine_allowance_mg ||
        ocrResult.blood_phe_target_min ||
        ocrResult.blood_phe_target_max ||
        ocrResult.exchange_unit_mg;

      if (!hasAnyValue) {
        setErrorMessage(t("noValuesFound"));
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("unknownError");
      setErrorMessage(message);
      setStatus("error");
      // 에러 시에도 preview 제거
      setPreview(null);
    }
  }, [preview, t]);

  const handleApply = useCallback(() => {
    if (!result) return;

    const values: Parameters<typeof onValuesExtracted>[0] = {};

    if (result.phenylalanine_allowance_mg) {
      values.phenylalanine_mg = result.phenylalanine_allowance_mg;
    }
    if (result.blood_phe_target_min) {
      values.blood_phe_target_min = result.blood_phe_target_min;
    }
    if (result.blood_phe_target_max) {
      values.blood_phe_target_max = result.blood_phe_target_max;
    }
    if (result.blood_phe_unit) {
      values.blood_phe_unit = result.blood_phe_unit;
    }
    if (result.exchange_unit_mg) {
      values.exchange_unit_mg = result.exchange_unit_mg;
    }

    onValuesExtracted(values);
  }, [result, onValuesExtracted]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return t("confidenceHigh");
    if (confidence >= 0.5) return t("confidenceMedium");
    return t("confidenceLow");
  };

  return (
    <div className="space-y-4">
      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
        <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">{t("privacyTitle")}</p>
          <p className="text-xs mt-0.5 opacity-80">
            {t("privacyDesc")}
          </p>
        </div>
      </div>

      {/* Idle state - upload prompt */}
      {status === "idle" && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("scanTitle")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("scanDesc")}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                {t("takePhoto")}
              </Button>
              <Button
                outline
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {t("uploadFile")}
              </Button>
            </div>

            <button
              onClick={onFallbackToManual}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              {t("skipManual")}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </Card>
      )}

      {/* Preview state - confirm before upload */}
      {status === "preview" && preview && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t("preview")}
            </h3>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Document preview"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 object-contain bg-gray-50 dark:bg-gray-800"
          />

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs">
              {t("cropWarning")}
            </p>
          </div>

          <div className="flex gap-3">
            <Button outline className="flex-1" onClick={handleReset}>
              {t("retake")}
            </Button>
            <Button className="flex-1" onClick={handleUpload}>
              {t("analyze")}
            </Button>
          </div>
        </Card>
      )}

      {/* Uploading state */}
      {status === "uploading" && (
        <Card className="p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto">
              <div className="animate-spin rounded-full w-12 h-12 border-3 border-gray-300 dark:border-gray-600 border-t-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {t("analyzing")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("analyzingHint")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Success state - show extracted values */}
      {status === "success" && result && (
        <div className="space-y-3">
          {/* Confidence badge */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t("extractedValues")}
            </h3>
            <span
              className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}
            >
              {t("confidence")}: {getConfidenceLabel(result.confidence)} (
              {Math.round(result.confidence * 100)}%)
            </span>
          </div>

          {/* Low confidence warning */}
          {result.confidence < 0.5 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                {t("lowConfidenceWarning")}
              </p>
            </div>
          )}

          {/* Extracted values card */}
          <Card className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.phenylalanine_allowance_mg && (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("dailyPheAllowance")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("dailyPheAllowanceDesc")}
                  </p>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {result.phenylalanine_allowance_mg} mg/day
                </span>
              </div>
            )}

            {(result.blood_phe_target_min || result.blood_phe_target_max) && (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("bloodPheTarget")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("bloodPheTargetDesc")}
                  </p>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {result.blood_phe_target_min ?? "?"} -{" "}
                  {result.blood_phe_target_max ?? "?"}{" "}
                  {result.blood_phe_unit ?? ""}
                </span>
              </div>
            )}

            {result.exchange_unit_mg && (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("exchangeUnit")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("exchangeUnitDesc")}
                  </p>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {result.exchange_unit_mg} mg
                </span>
              </div>
            )}
          </Card>

          {/* Evidence snippets */}
          {result.evidence_snippets.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("evidence")}
                </h4>
              </div>
              <div className="space-y-2">
                {result.evidence_snippets.map((snippet, i) => (
                  <div
                    key={i}
                    className="pl-3 border-l-2 border-indigo-300 dark:border-indigo-600"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      &ldquo;{snippet}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button outline className="flex-1" onClick={onFallbackToManual}>
              <Edit3 className="w-4 h-4" />
              {t("editManually")}
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              <CheckCircle2 className="w-4 h-4" />
              {t("applyValues")}
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {t("errorTitle")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-3">
              <Button outline className="flex-1" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
                {t("tryAgain")}
              </Button>
              <Button className="flex-1" onClick={onFallbackToManual}>
                <Edit3 className="w-4 h-4" />
                {t("enterManually")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
