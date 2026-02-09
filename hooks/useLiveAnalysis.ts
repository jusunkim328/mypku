"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GoogleGenAI, Modality, Session, type LiveServerMessage } from "@google/genai";
import {
  startMicrophoneCapture,
  stopMicrophoneCapture,
  playAudioChunk,
  stopPlayback,
} from "@/lib/audioUtils";
import type { FoodItem, NutritionData } from "@/types/nutrition";
import { calculateTotalNutrition } from "@/lib/nutrition";

// 세션 제한: 2분
const SESSION_LIMIT_MS = 2 * 60 * 1000;

// 비디오 프레임 전송 간격: 1 FPS
const VIDEO_FRAME_INTERVAL_MS = 1000;

export type LiveStatus = "idle" | "connecting" | "connected" | "extracting" | "error";

interface LiveMessage {
  role: "user" | "model";
  text: string;
}

/**
 * 세션 종료 후 대화 텍스트를 서버 API로 보내 FoodItem[] 추출
 */
interface ExtractResult {
  foods: FoodItem[];
  errorCode?: string;
}

async function extractFoodsFromTranscript(
  messages: LiveMessage[]
): Promise<ExtractResult> {
  if (messages.length === 0) return { foods: [] };

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
    .join("\n");

  try {
    const res = await fetch("/api/live-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) return { foods: [], errorCode: "extract_failed" };
    const data = await res.json();
    return { foods: (data.foods || []) as FoodItem[], errorCode: data.errorCode };
  } catch {
    return { foods: [], errorCode: "extract_failed" };
  }
}

const buildSystemInstruction = (locale: string) => {
  const langName = locale === "ko" ? "Korean" : locale === "ru" ? "Russian" : "English";
  return `You are a PKU diet analyst. Speak in ${langName}.

RULES:
- You only have 2 minutes. Be extremely brief. No disclaimers, no "I'm not a doctor", no filler.
- Every food you see or hear: name it, estimate weight, say Phe in mg, say safe/caution/avoid. That's it.
- If high Phe, suggest one low-Phe alternative in one sentence.
- Never comment on appearance ("looks delicious", "creamy"). Just give the Phe data.
- Max 2 sentences per response.

PKU reference (1 Exchange = 50mg Phe):
- safe ≤20mg: fruits, most vegetables, oils, sugar, low-protein specialty foods
- caution 21-100mg: rice, bread, some vegetables
- avoid >100mg: meat, fish, eggs, dairy, nuts, beans, soy`;
};

export function useLiveAnalysis(locale: string = "en") {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_LIMIT_MS);
  const [error, setError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const messagesRef = useRef<LiveMessage[]>([]);
  const extractingRef = useRef(false);
  const extractAfterSessionRef = useRef<() => void>(() => {});
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // 총 영양소 계산
  const totalNutrition = useMemo(() => calculateTotalNutrition(foods), [foods]);

  // messages ref 동기화
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 정리 함수
  const cleanup = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopMicrophoneCapture();
    stopPlayback();

    // 카메라 스트림 중지
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // ignore
      }
      sessionRef.current = null;
    }
    ctxRef.current = null;

    setIsMicOn(false);
    setIsCameraOn(false);
  }, []);

  // 세션 타이머
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, SESSION_LIMIT_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        cleanup();
        setSessionExpired(true);
        // 타이머 만료 시 extractAfterSession 재사용 (extractingRef 가드 포함)
        extractAfterSessionRef.current();
      }
    }, 1000);
  }, [cleanup]);

  // 비디오 프레임 전송
  const startVideoFrames = useCallback(() => {
    frameIntervalRef.current = setInterval(() => {
      const session = sessionRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!session || !video || !canvas) return;
      if (video.readyState < 2) return;

      if (!ctxRef.current) {
        canvas.width = 640;
        canvas.height = 480;
        ctxRef.current = canvas.getContext("2d");
      }
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 640, 480);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const base64 = dataUrl.split(",")[1];
      try {
        session.sendRealtimeInput({
          video: {
            mimeType: "image/jpeg",
            data: base64,
          },
        });
      } catch {
        // session closed — intentionally ignored
      }
    }, VIDEO_FRAME_INTERVAL_MS);
  }, []);

  // 연결
  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setExtractError(null);
    setFoods([]);
    setMessages([]);
    setTimeRemaining(SESSION_LIMIT_MS);
    setSessionExpired(false);

    try {
      // 1. Ephemeral token 발급
      const tokenRes = await fetch("/api/live-token", { method: "POST" });
      if (!tokenRes.ok) {
        throw new Error(`Token error: ${tokenRes.status}`);
      }
      const { token, model } = await tokenRes.json();

      // 2. 카메라 시작
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);

      // 3. Live API 연결
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemInstruction(locale),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus("connected");
          },
          onmessage: (msg: LiveServerMessage) => {
            // 오디오 재생 + 모델 텍스트(thinking) 캡처
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
                // native-audio 모델: thinking 텍스트에 음식 분석 내용 포함
                if (part.text) {
                  const text = part.text.trim();
                  if (text) {
                    setMessages((prev) => {
                      if (prev.length > 0 && prev[prev.length - 1].role === "model") {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                          role: "model",
                          text: updated[updated.length - 1].text + "\n" + text,
                        };
                        return updated;
                      }
                      return [...prev, { role: "model", text }];
                    });
                  }
                }
              }
            }

            // 입력 트랜스크립션 (사용자 음성 → 텍스트)
            if (msg.serverContent?.inputTranscription?.text) {
              const text = msg.serverContent.inputTranscription.text.trim();
              if (text) {
                setMessages((prev) => [...prev, { role: "user", text }]);
              }
            }

            // 출력 트랜스크립션 (AI 음성 → 텍스트, 일부 모델에서만 지원)
            if (msg.serverContent?.outputTranscription?.text) {
              const text = msg.serverContent.outputTranscription.text.trim();
              if (text) {
                setMessages((prev) => {
                  if (prev.length > 0 && prev[prev.length - 1].role === "model") {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "model",
                      text: updated[updated.length - 1].text + " " + text,
                    };
                    return updated;
                  }
                  return [...prev, { role: "model", text }];
                });
              }
            }

          },
          onerror: (e: ErrorEvent) => {
            console.error("[Live] onerror:", e.message, e);
            setError(e.message);
            setStatus("error");
          },
          onclose: () => {
            cleanup();
            setStatus("idle");
          },
        },
      });

      sessionRef.current = session;

      // 4. 초기 메시지 전송 — AI가 사용자 언어로 PKU 분석가로서 인사하도록
      const langName = locale === "ko" ? "Korean" : locale === "ru" ? "Russian" : "English";
      try {
        session.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: `I'm a PKU patient. Greet me briefly in ${langName} and say you're ready to analyze my food for phenylalanine. Then ask me to show my food on camera and describe what I know — the name, ingredients, amounts, etc. Also mention that if I have a menu, reading the dish name and ingredients from it would be helpful too. Speak in ${langName} for the entire session. Always tell me the Phe mg for every food you see.` }],
            },
          ],
          turnComplete: true,
        });
      } catch {
        // session may have closed — intentionally ignored
      }

      // 5. 마이크 시작
      await startMicrophoneCapture((base64Pcm) => {
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64Pcm,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // session closed — intentionally ignored
        }
      });
      setIsMicOn(true);

      // 5. 비디오 프레임 전송 시작
      startVideoFrames();

      // 6. 타이머 시작
      startTimer();
    } catch (err) {
      console.error("[Live] Connect failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
      cleanup();
    }
  }, [cleanup, startVideoFrames, startTimer, locale]);

  // 대화 종료 후 FoodItem 추출
  const extractAfterSession = useCallback(async () => {
    if (extractingRef.current) return;
    const msgs = messagesRef.current;
    if (msgs.length === 0) {
      setStatus("idle");
      return;
    }
    extractingRef.current = true;
    setStatus("extracting");
    setExtractError(null);
    try {
      const result = await extractFoodsFromTranscript(msgs);
      if (result.foods.length > 0) {
        setFoods(result.foods);
      }
      if (result.errorCode) {
        setExtractError(result.errorCode);
      }
    } catch (err) {
      console.error("[Live] Extract error:", err);
      setExtractError("extract_failed");
    }
    extractingRef.current = false;
    setStatus("idle");
  }, []);

  // extractAfterSession ref 동기화 (startTimer에서 참조하기 위함)
  useEffect(() => {
    extractAfterSessionRef.current = extractAfterSession;
  }, [extractAfterSession]);

  // 연결 해제
  const disconnect = useCallback(() => {
    cleanup();
    extractAfterSession();
  }, [cleanup, extractAfterSession]);

  // 마이크 토글
  const toggleMic = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    if (isMicOn) {
      stopMicrophoneCapture();
      setIsMicOn(false);
    } else {
      await startMicrophoneCapture((base64Pcm) => {
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64Pcm,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // session closed — intentionally ignored
        }
      });
      setIsMicOn(true);
    }
  }, [isMicOn]);

  // FoodItem 업데이트
  const updateFood = useCallback((id: string, updates: Partial<FoodItem>) => {
    setFoods((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates, userVerified: true } : f))
    );
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // 상태
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
    // refs (UI에서 연결)
    videoRef,
    canvasRef,
    // 액션
    connect,
    disconnect,
    toggleMic,
    updateFood,
    setFoods,
  };
}
