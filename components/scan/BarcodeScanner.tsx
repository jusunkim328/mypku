"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";

// 바코드 체크섬 검증
function validateBarcode(barcode: string): boolean {
  // EAN-13 체크섬 검증
  if (barcode.length === 13 && /^\d{13}$/.test(barcode)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12]);
  }

  // EAN-8 체크섬 검증
  if (barcode.length === 8 && /^\d{8}$/.test(barcode)) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[7]);
  }

  // UPC-A (12자리) 체크섬 검증
  if (barcode.length === 12 && /^\d{12}$/.test(barcode)) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[11]);
  }

  // 기타 형식 (UPC-E, Code-128 등)은 길이만 검증
  return barcode.length >= 6 && barcode.length <= 14 && /^\d+$/.test(barcode);
}

// 스캔 상태 타입
type ScanStatus = "idle" | "detecting" | "verifying" | "invalid";

// 검증 결과 타입
interface ValidationResult {
  consensus: string | null;
  currentBarcode: string | null;
  progress: number;
  maxProgress: number;
  isValid: boolean;
}

// 다중 프레임 검증 클래스
class ConsensusValidator {
  private history: string[] = [];
  private readonly minConsensus: number;
  private readonly windowSize: number;
  private lastInvalidBarcode: string | null = null;

  constructor(minConsensus = 3, windowSize = 5) {
    this.minConsensus = minConsensus;
    this.windowSize = windowSize;
  }

  addResult(barcode: string): ValidationResult {
    // 체크섬 검증
    const isValid = validateBarcode(barcode);

    if (!isValid) {
      this.lastInvalidBarcode = barcode;
      return {
        consensus: null,
        currentBarcode: barcode,
        progress: 0,
        maxProgress: this.minConsensus,
        isValid: false,
      };
    }

    this.lastInvalidBarcode = null;
    this.history.push(barcode);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // 최빈값 계산
    const counts = this.history.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return {
        consensus: null,
        currentBarcode: barcode,
        progress: 1,
        maxProgress: this.minConsensus,
        isValid: true,
      };
    }

    const [mostCommon, count] = entries[0];

    return {
      consensus: count >= this.minConsensus ? mostCommon : null,
      currentBarcode: mostCommon,
      progress: count,
      maxProgress: this.minConsensus,
      isValid: true,
    };
  }

  reset() {
    this.history = [];
    this.lastInvalidBarcode = null;
  }
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const t = useTranslations("BarcodeScanner");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [manualBarcode, setManualBarcode] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const validatorRef = useRef<ConsensusValidator>(new ConsensusValidator(3, 5));

  // 스캔 피드백 상태
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const invalidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 스캐닝 중지 (먼저 정의)
  const stopScanning = useCallback(() => {
    setIsScanning(false);

    // 감지 루프 정리
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 타임아웃 정리
    if (invalidTimeoutRef.current) {
      clearTimeout(invalidTimeoutRef.current);
      invalidTimeoutRef.current = null;
    }

    // 다중 프레임 검증기 초기화
    validatorRef.current.reset();

    // 피드백 상태 초기화
    setScanStatus("idle");
    setDetectedBarcode(null);
    setVerifyProgress(0);
  }, []);

  // Native BarcodeDetector API 사용
  const detectWithNativeAPI = useCallback(() => {
    // @ts-expect-error BarcodeDetector is not in TypeScript types yet
    const barcodeDetector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });

    let isActive = true; // 로컬 플래그로 루프 제어
    const validator = validatorRef.current;

    const detect = async () => {
      if (!isActive) return;

      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;

            // 다중 프레임 검증 (체크섬 검증 포함)
            const result = validator.addResult(rawValue);

            // 피드백 상태 업데이트
            if (!result.isValid) {
              // 체크섬 검증 실패
              setScanStatus("invalid");
              setDetectedBarcode(result.currentBarcode);
              setVerifyProgress(0);

              // 1.5초 후 상태 초기화
              if (invalidTimeoutRef.current) {
                clearTimeout(invalidTimeoutRef.current);
              }
              invalidTimeoutRef.current = setTimeout(() => {
                if (isActive) {
                  setScanStatus("detecting");
                  setDetectedBarcode(null);
                }
              }, 1500);
            } else if (result.consensus) {
              // 검증 완료
              isActive = false;
              onScan(result.consensus);
              stopScanning();
              return;
            } else {
              // 검증 진행 중
              setScanStatus("verifying");
              setDetectedBarcode(result.currentBarcode);
              setVerifyProgress(result.progress);
            }
          } else {
            // 바코드 미감지 - detecting 상태 유지
            if (scanStatus !== "invalid") {
              setScanStatus("detecting");
            }
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };

    detect();

    // cleanup 함수 반환
    return () => {
      isActive = false;
    };
  }, [onScan, stopScanning, scanStatus]);

  // 바코드 감지 시작
  const startScanning = useCallback(async () => {
    try {
      // 카메라 접근 요청 (고해상도로 상향)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        setScanStatus("detecting");

        // BarcodeDetector API 지원 확인
        if ("BarcodeDetector" in window) {
          cleanupRef.current = detectWithNativeAPI();
        } else {
          // 폴백: 수동 입력 안내
          console.log("BarcodeDetector not supported, using manual input");
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCamera(false);
      onError?.(t("cameraError"));
    }
  }, [detectWithNativeAPI, onError, t]);

  // 수동 바코드 입력 처리
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim() && /^\d{8,14}$/.test(manualBarcode.trim())) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="space-y-4">
      {/* 카메라 뷰 */}
      {hasCamera && (
        <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] md:aspect-video lg:max-w-2xl lg:mx-auto">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* 스캔 오버레이 */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* 스캔 프레임 */}
              <div
                className={`w-64 h-32 border-2 rounded-lg relative transition-colors duration-200 ${
                  scanStatus === "invalid"
                    ? "border-red-500"
                    : scanStatus === "verifying"
                      ? "border-green-500"
                      : "border-white"
                }`}
              >
                <div
                  className={`absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 rounded-tl transition-colors duration-200 ${
                    scanStatus === "invalid"
                      ? "border-red-500"
                      : scanStatus === "verifying"
                        ? "border-green-500"
                        : "border-indigo-500"
                  }`}
                />
                <div
                  className={`absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 rounded-tr transition-colors duration-200 ${
                    scanStatus === "invalid"
                      ? "border-red-500"
                      : scanStatus === "verifying"
                        ? "border-green-500"
                        : "border-indigo-500"
                  }`}
                />
                <div
                  className={`absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 rounded-bl transition-colors duration-200 ${
                    scanStatus === "invalid"
                      ? "border-red-500"
                      : scanStatus === "verifying"
                        ? "border-green-500"
                        : "border-indigo-500"
                  }`}
                />
                <div
                  className={`absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 rounded-br transition-colors duration-200 ${
                    scanStatus === "invalid"
                      ? "border-red-500"
                      : scanStatus === "verifying"
                        ? "border-green-500"
                        : "border-indigo-500"
                  }`}
                />

                {/* 스캔 라인 애니메이션 */}
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 animate-scan ${
                    scanStatus === "invalid"
                      ? "bg-red-500"
                      : scanStatus === "verifying"
                        ? "bg-green-500"
                        : "bg-red-500"
                  }`}
                />
              </div>

              {/* 상태 피드백 */}
              <div className="mt-4 text-center">
                {scanStatus === "detecting" && (
                  <p className="text-white text-sm bg-black/50 px-3 py-1.5 rounded-full">
                    {t("scanning")}
                  </p>
                )}
                {scanStatus === "verifying" && detectedBarcode && (
                  <div className="bg-green-500/90 px-3 py-1.5 rounded-full">
                    <p className="text-white text-sm font-medium">
                      {t("verifying")} ({verifyProgress}/3)
                    </p>
                    <p className="text-white/80 text-xs mt-0.5 font-mono">
                      {detectedBarcode}
                    </p>
                  </div>
                )}
                {scanStatus === "invalid" && detectedBarcode && (
                  <div className="bg-red-500/90 px-3 py-1.5 rounded-full">
                    <p className="text-white text-sm font-medium">{t("invalidBarcode")}</p>
                    <p className="text-white/80 text-xs mt-0.5 font-mono">
                      {detectedBarcode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 스캔 버튼 */}
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <button
                onClick={startScanning}
                className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {t("startScan")}
              </button>
            </div>
          )}

          {/* 스캔 중지 버튼 */}
          {isScanning && (
            <button
              onClick={stopScanning}
              className="absolute bottom-4 right-4 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
            >
              {t("stopScan")}
            </button>
          )}
        </div>
      )}

      {/* 카메라 없음 메시지 */}
      {!hasCamera && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 text-center">
          <Camera className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{t("noCameraMessage")}</p>
        </div>
      )}

      {/* 수동 바코드 입력 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 md:p-5 lg:p-6 shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 lg:max-w-2xl lg:mx-auto">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("manualEntry")}</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
            placeholder={t("enterBarcode")}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-500"
            maxLength={14}
          />
          <button
            type="submit"
            disabled={!/^\d{8,14}$/.test(manualBarcode)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("lookup")}
          </button>
        </form>
      </div>

      {/* 스캔 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(128px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
