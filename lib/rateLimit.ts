// In-memory Sliding Window Rate Limiter
// Vercel Serverless 인스턴스간 메모리 비공유이므로 단일 인스턴스 burst 방어용
// 추후 Upstash Redis 업그레이드 가능한 인터페이스 유지

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  resetMs: number;
}

const store = new Map<string, number[]>();

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // 기존 타임스탬프 가져오기 + 만료된 것 제거
  const timestamps = (store.get(key) || []).filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    store.set(key, timestamps);
    return { allowed: false, resetMs: Math.max(resetMs, 0) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, resetMs: 0 };
}

export const RATE_LIMITS = {
  AI_ANALYZE: { maxRequests: 10, windowMs: 60 * 1000 },      // 10/min
  COACHING: { maxRequests: 5, windowMs: 60 * 60 * 1000 },     // 5/hour
  LIVE_TOKEN: { maxRequests: 3, windowMs: 60 * 1000 },        // 3/min
  BARCODE_OCR: { maxRequests: 15, windowMs: 60 * 1000 },      // 15/min
} as const;
