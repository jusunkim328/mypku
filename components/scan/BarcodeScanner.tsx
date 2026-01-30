"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

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
  }, []);

  // Native BarcodeDetector API 사용
  const detectWithNativeAPI = useCallback(() => {
    // @ts-expect-error BarcodeDetector is not in TypeScript types yet
    const barcodeDetector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });

    let isActive = true; // 로컬 플래그로 루프 제어

    const detect = async () => {
      if (!isActive) return;

      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            isActive = false;
            onScan(barcode);
            stopScanning();
            return;
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
  }, [onScan, stopScanning]);

  // 바코드 감지 시작
  const startScanning = useCallback(async () => {
    try {
      // 카메라 접근 요청
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
        setIsScanning(true);

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
        <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* 스캔 오버레이 */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br" />

                {/* 스캔 라인 애니메이션 */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 animate-scan" />
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-600">{t("noCameraMessage")}</p>
        </div>
      )}

      {/* 수동 바코드 입력 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t("manualEntry")}</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
            placeholder={t("enterBarcode")}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
