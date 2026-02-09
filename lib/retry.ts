/**
 * 공통 재시도 유틸리티 — Exponential Backoff with Jitter
 *
 * 서버용: withRetry<T> (SDK Error 기반)
 * 클라이언트용: fetchWithRetry (HTTP Response 기반)
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryableCheck?: (error: Error) => boolean;
  logTag?: string;
}

const DEFAULT_RETRYABLE_CHECK = (error: Error): boolean =>
  error.message.includes("429") ||
  error.message.includes("Too Many Requests") ||
  error.message.includes("503") ||
  error.message.includes("Resource exhausted");

/**
 * 서버용: SDK Error 기반 Exponential Backoff 재시도
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    jitter = true,
    retryableCheck = DEFAULT_RETRYABLE_CHECK,
    logTag = "Retry",
  } = config ?? {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!retryableCheck(lastError) || attempt === maxRetries) {
        throw lastError;
      }

      const jitterMs = jitter ? Math.random() * 1000 : 0;
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + jitterMs,
        maxDelayMs
      );

      console.log(
        `[${logTag}] Failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${Math.round(delay / 1000)}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 클라이언트용: fetch Response 기반 Exponential Backoff 재시도
 * 5xx 에러 및 네트워크 에러만 재시도, 4xx는 즉시 반환
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config?: Omit<RetryConfig, "retryableCheck">
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    jitter = true,
    logTag = "FetchRetry",
  } = config ?? {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network error");
    }

    if (attempt === maxRetries) {
      break;
    }

    const jitterMs = jitter ? Math.random() * 1000 : 0;
    const delay = Math.min(
      baseDelayMs * Math.pow(2, attempt) + jitterMs,
      maxDelayMs
    );

    console.log(
      `[${logTag}] Failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
        `retrying in ${Math.round(delay / 1000)}s...`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError || new Error("Request failed");
}
