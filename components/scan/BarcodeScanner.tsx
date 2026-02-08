"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Camera, AlertCircle, Loader2, ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginPromptCard from "@/components/common/LoginPromptCard";

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

  constructor(minConsensus = 2, windowSize = 4) {
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
  const { isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [manualBarcode, setManualBarcode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  // zxing-wasm은 정확도가 높아서 2회 검증으로 충분
  const validatorRef = useRef<ConsensusValidator>(new ConsensusValidator(2, 4));

  // 스캔 피드백 상태
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const invalidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 안내 메시지 상태
  const [showHint, setShowHint] = useState(false);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

  // 사용자가 힌트 버튼을 클릭하여 활성화했는지
  const [hintClickedOn, setHintClickedOn] = useState(false);

  // 감지 방법 표시
  const [detectionMethod, setDetectionMethod] = useState<"native" | "zxing-wasm" | null>(null);

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

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }

    // 다중 프레임 검증기 초기화
    validatorRef.current.reset();

    // 피드백 상태 초기화
    setScanStatus("idle");
    setDetectedBarcode(null);
    setVerifyProgress(0);
    setShowHint(false);
    setDetectionMethod(null);
    setHintClickedOn(false);
  }, []);

  // Native BarcodeDetector API 사용
  const detectWithNativeAPI = useCallback(() => {
    // @ts-expect-error BarcodeDetector is not in TypeScript types yet
    const barcodeDetector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });

    let isActive = true;
    const validator = validatorRef.current;
    setDetectionMethod("native");

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
              // 바코드 감지되면 힌트 숨김
              setShowHint(false);
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

  // zxing-wasm 폴백 사용 (Safari 최적화)
  const detectWithZxingWasm = useCallback(async () => {
    const { readBarcodesFromImageData, setZXingModuleOverrides } = await import("zxing-wasm/reader");

    // WASM 모듈 로드 (CDN에서)
    setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) => {
        if (path.endsWith(".wasm")) {
          return `https://cdn.jsdelivr.net/npm/zxing-wasm@2/dist/reader/${path}`;
        }
        return prefix + path;
      },
    });

    let isActive = true;
    const validator = validatorRef.current;
    setDetectionMethod("zxing-wasm");

    // 카메라 스트림 획득
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const detect = async () => {
      if (!isActive || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState === 4) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const results = await readBarcodesFromImageData(imageData, {
            formats: ["EAN-13", "EAN-8", "UPC-A"],
            tryHarder: true,
          });

          if (results.length > 0 && results[0].text) {
            const rawValue = results[0].text;
            console.log("[zxing-wasm] Detected:", rawValue);
            const validationResult = validator.addResult(rawValue);

            if (!validationResult.isValid) {
              setScanStatus("invalid");
              setDetectedBarcode(validationResult.currentBarcode);
              setVerifyProgress(0);

              if (invalidTimeoutRef.current) {
                clearTimeout(invalidTimeoutRef.current);
              }
              invalidTimeoutRef.current = setTimeout(() => {
                if (isActive) {
                  setScanStatus("detecting");
                  setDetectedBarcode(null);
                }
              }, 1500);
            } else if (validationResult.consensus) {
              isActive = false;
              onScan(validationResult.consensus);
              stopScanning();
              return;
            } else {
              setScanStatus("verifying");
              setDetectedBarcode(validationResult.currentBarcode);
              setVerifyProgress(validationResult.progress);
              setShowHint(false);
            }
          }
        } catch (err) {
          console.error("[zxing-wasm] Detection error:", err);
        }
      }

      if (isActive) {
        // 10fps로 스캔 (100ms 간격)
        setTimeout(() => requestAnimationFrame(detect), 100);
      }
    };

    detect();

    return () => {
      isActive = false;
    };
  }, [onScan, stopScanning]);

  // 바코드 감지 시작
  const startScanning = useCallback(async () => {
    try {
      // Native API 지원 확인
      const hasNativeAPI = "BarcodeDetector" in window;

      if (hasNativeAPI) {
        // Native API 사용 - 직접 카메라 스트림 획득
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
          scanStartTimeRef.current = Date.now();

          // 10초 후 힌트 자동 표시 타이머 시작
          hintTimeoutRef.current = setTimeout(() => {
            setShowHint(true);
          }, 10000);

          cleanupRef.current = detectWithNativeAPI();
        }
      } else {
        // zxing-wasm 폴백 사용
        setIsScanning(true);
        setScanStatus("detecting");
        scanStartTimeRef.current = Date.now();

        // 10초 후 힌트 자동 표시 타이머 시작
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(true);
        }, 10000);

        cleanupRef.current = await detectWithZxingWasm();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCamera(false);
      onError?.(t("cameraError"));
    }
  }, [detectWithNativeAPI, detectWithZxingWasm, onError, t]);

  // 이미지 리사이즈 함수 (기존 ImageUploader 패턴)
  const resizeImage = (file: File, maxSize = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // 사진 업로드로 바코드 OCR 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAuthenticated) return;

    // 스캔 중이면 중지
    if (isScanning) stopScanning();

    setIsUploading(true);

    try {
      const base64 = await resizeImage(file);
      const res = await fetch("/api/barcode-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();

      if (data.success && data.barcode) {
        onScan(data.barcode);
      } else {
        onError?.(t("photoOcrFailed"));
      }
    } catch (err) {
      console.error("OCR error:", err);
      onError?.(t("photoOcrFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  // 진행률 인디케이터 렌더링 (2회 검증)
  const renderProgressDots = () => {
    const dots = [];
    for (let i = 0; i < 2; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2.5 h-2.5 rounded-full mx-0.5 transition-all duration-200 ${
            i < verifyProgress
              ? "bg-green-500 scale-110"
              : "bg-white/50"
          }`}
        />
      );
    }
    return dots;
  };

  return (
    <div className="space-y-4">
      {/* 카메라 뷰 */}
      {hasCamera && (
        <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] md:aspect-video lg:max-w-2xl lg:mx-auto">
          {/* video 엘리먼트 */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* 스캔 오버레이 */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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
                  <div className="space-y-2">
                    <p className="text-white text-sm bg-black/50 px-3 py-1.5 rounded-full">
                      {t("scanning")}
                    </p>
                    {/* 진행률 점 표시 (대기 상태) */}
                    <div className="flex justify-center">
                      {[0, 1].map((i) => (
                        <span
                          key={i}
                          className="inline-block w-2.5 h-2.5 rounded-full mx-0.5 bg-white/30"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {scanStatus === "verifying" && detectedBarcode && (
                  <div className="bg-green-500/90 px-4 py-2 rounded-lg space-y-1.5">
                    <p className="text-white text-sm font-medium">
                      {t("verifying")} ({verifyProgress}/2)
                    </p>
                    {/* 진행률 점 표시 */}
                    <div className="flex justify-center">
                      {renderProgressDots()}
                    </div>
                    <p className="text-white/80 text-xs font-mono">
                      {detectedBarcode}
                    </p>
                  </div>
                )}
                {scanStatus === "invalid" && detectedBarcode && (
                  <div className="bg-red-500/90 px-4 py-2 rounded-lg space-y-1">
                    <p className="text-white text-sm font-medium">{t("invalidBarcode")}</p>
                    <p className="text-white/80 text-xs font-mono">
                      {detectedBarcode}
                    </p>
                  </div>
                )}
              </div>

              {/* 안내 메시지 (10초 후 자동 표시 또는 정보 버튼 클릭 시) */}
              {(showHint || hintClickedOn) && scanStatus === "detecting" && (
                <div className="absolute bottom-14 left-4 right-4 bg-yellow-500/90 text-black text-sm px-4 py-3 rounded-lg flex items-start gap-2 pointer-events-auto">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("hintTitle")}</p>
                    <ul className="text-xs mt-1 space-y-0.5 opacity-90">
                      <li>• {t("hint1")}</li>
                      <li>• {t("hint2")}</li>
                      <li>• {t("hint3")}</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 정보 버튼 (스캔 중 항상 표시) */}
              {isScanning && scanStatus === "detecting" && (
                <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors shadow-lg ${
                      showHint || hintClickedOn
                        ? "bg-yellow-400 text-black"
                        : "bg-yellow-500/90 text-black hover:bg-yellow-400"
                    }`}
                    onClick={() => {
                      if (showHint || hintClickedOn) {
                        // 힌트가 표시 중이면 둘 다 끄기
                        setShowHint(false);
                        setHintClickedOn(false);
                      } else {
                        // 힌트가 숨겨져 있으면 클릭으로 켜기
                        setHintClickedOn(true);
                      }
                    }}
                    aria-label="Toggle scanning hints"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* 감지 방법 표시 (개발용, 작은 텍스트) */}
              {detectionMethod && (
                <div className="absolute top-2 left-2 text-white/50 text-xs bg-black/30 px-2 py-0.5 rounded">
                  {detectionMethod === "native" ? "Native API" : "zxing-wasm"}
                </div>
              )}
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
              className="absolute bottom-4 right-4 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors z-10"
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

      {/* 사진으로 바코드 인식 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 lg:max-w-2xl lg:mx-auto">
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("photoUploadTitle")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("photoUploadHint")}
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isUploading
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-wait"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("photoUploading")}
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    {t("photoUploadButton")}
                  </>
                )}
              </span>
            </label>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t("photoUploadTitle")}
            </h3>
            <LoginPromptCard compact features={["featureBarcodeOcr"]} />
          </div>
        )}
      </div>

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
      <style jsx global>{`
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
