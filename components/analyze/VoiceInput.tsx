"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Mic, Square } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, onError, disabled }: VoiceInputProps) {
  const t = useTranslations("VoiceInput");
  const locale = useLocale();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // 브라우저 지원 확인
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.(t("notSupported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    // 앱의 locale에 맞춰 음성 인식 언어 설정
    recognition.lang = locale === "ko" ? "ko-KR" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        onError?.(t("permissionDenied"));
      } else {
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      onError?.(String(error));
    }
  }, [onTranscript, onError, t, locale]);

  // 음성 인식 중지
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
        {t("notSupported")}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 음성 인식 버튼 */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          transition-all transform active:scale-95
          ${
            isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-700"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        aria-label={isListening ? t("stopRecording") : t("startRecording")}
      >
        {isListening ? (
          <Square className="w-8 h-8 text-white" fill="currentColor" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>

      {/* 상태 텍스트 */}
      <div className="text-center">
        {isListening ? (
          <div className="flex items-center gap-2 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">{t("listening")}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">{t("speakNow")}</span>
        )}
      </div>

      {/* 중간 결과 표시 */}
      {interimTranscript && (
        <div className="w-full bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">
          &ldquo;{interimTranscript}&rdquo;
        </div>
      )}
    </div>
  );
}

// TypeScript 타입 선언
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
