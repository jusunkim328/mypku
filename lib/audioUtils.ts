/**
 * 오디오 유틸리티 — Live API용 마이크 캡처 + 스피커 재생
 *
 * 마이크: getUserMedia → AudioWorklet (16kHz PCM Int16) → base64 → sendRealtimeInput
 * 스피커: base64 PCM → Float32Array → AudioBufferSource (24kHz)
 */

// AudioWorklet 프로세서 코드 (인라인)
const AUDIO_WORKLET_CODE = `
class AudioCaptureProcessor extends AudioWorkletProcessor {
  buffer = new Int16Array(2048);
  idx = 0;

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buffer[this.idx++] = ch[i] * 32768;
      if (this.idx >= this.buffer.length) {
        this.port.postMessage({ pcm: this.buffer.slice(0, this.idx).buffer });
        this.idx = 0;
      }
    }
    return true;
  }
}
registerProcessor("audio-capture", AudioCaptureProcessor);
`;

let micStream: MediaStream | null = null;
let micContext: AudioContext | null = null;
let micWorklet: AudioWorkletNode | null = null;

/**
 * 마이크 캡처 시작 — PCM 16kHz Int16 청크를 콜백으로 전달
 */
export async function startMicrophoneCapture(
  onChunk: (base64Pcm: string) => void
): Promise<void> {
  // 기존 캡처가 있으면 정리
  stopMicrophoneCapture();

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micContext = new AudioContext({ sampleRate: 16000 });
  const source = micContext.createMediaStreamSource(micStream);

  const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  await micContext.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);

  micWorklet = new AudioWorkletNode(micContext, "audio-capture");
  micWorklet.port.onmessage = (ev: MessageEvent) => {
    const buf: ArrayBuffer = ev.data.pcm;
    if (buf) {
      onChunk(arrayBufferToBase64(buf));
    }
  };
  source.connect(micWorklet);
}

/**
 * 마이크 캡처 중지
 */
export function stopMicrophoneCapture(): void {
  micWorklet?.disconnect();
  micWorklet = null;
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  if (micContext && micContext.state !== "closed") {
    micContext.close();
  }
  micContext = null;
}

// --- 스피커 재생 ---
let playCtx: AudioContext | null = null;
let nextPlayTime = 0;

/**
 * base64 PCM (24kHz 16bit mono) → Web Audio 재생
 */
export function playAudioChunk(base64Data: string): void {
  if (!playCtx || playCtx.state === "closed") {
    playCtx = new AudioContext({ sampleRate: 24000 });
    nextPlayTime = playCtx.currentTime;
  }

  const float32 = base64ToFloat32(base64Data);
  const buffer = playCtx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);
  const src = playCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(playCtx.destination);

  if (nextPlayTime < playCtx.currentTime) {
    nextPlayTime = playCtx.currentTime;
  }
  src.start(nextPlayTime);
  nextPlayTime += buffer.duration;
}

/**
 * 스피커 재생 중지 및 정리
 */
export function stopPlayback(): void {
  if (playCtx && playCtx.state !== "closed") {
    playCtx.close();
  }
  playCtx = null;
  nextPlayTime = 0;
}

// --- 유틸 ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.byteLength));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const length = bytes.length / 2;
  const float32 = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sample = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
    if (sample >= 32768) sample -= 65536;
    float32[i] = sample / 32768;
  }
  return float32;
}
