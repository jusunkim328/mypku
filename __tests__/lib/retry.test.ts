import { describe, it, expect, vi } from "vitest";
import { withRetry, fetchWithRetry } from "@/lib/retry";

describe("withRetry", () => {
  it("성공 시 즉시 반환", async () => {
    const result = await withRetry(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("재시도 후 성공", async () => {
    let attempt = 0;
    const result = await withRetry(
      () => {
        attempt++;
        if (attempt < 2) throw new Error("429 Too Many Requests");
        return Promise.resolve("ok");
      },
      { baseDelayMs: 10, logTag: "Test" }
    );
    expect(result).toBe("ok");
    expect(attempt).toBe(2);
  });

  it("재시도 불가 에러는 즉시 throw", async () => {
    await expect(
      withRetry(
        () => Promise.reject(new Error("400 Bad Request")),
        { baseDelayMs: 10 }
      )
    ).rejects.toThrow("400 Bad Request");
  });

  it("maxRetries 초과 시 throw", async () => {
    await expect(
      withRetry(
        () => Promise.reject(new Error("503 Service Unavailable")),
        { maxRetries: 1, baseDelayMs: 10 }
      )
    ).rejects.toThrow("503 Service Unavailable");
  });

  it("커스텀 retryableCheck 적용", async () => {
    let attempt = 0;
    const result = await withRetry(
      () => {
        attempt++;
        if (attempt < 2) throw new Error("custom-retryable");
        return Promise.resolve("ok");
      },
      {
        baseDelayMs: 10,
        retryableCheck: (e) => e.message.includes("custom-retryable"),
      }
    );
    expect(result).toBe("ok");
  });
});

describe("fetchWithRetry", () => {
  it("성공 응답 즉시 반환", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/api/test", {}, { baseDelayMs: 10 });
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("4xx 에러는 재시도 없이 반환", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("/api/test", {}, { baseDelayMs: 10 });
    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("5xx 에러는 재시도 후 throw", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("err", { status: 500 }));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithRetry("/api/test", {}, { maxRetries: 1, baseDelayMs: 10 })
    ).rejects.toThrow("Server error: 500");

    vi.unstubAllGlobals();
  });
});
