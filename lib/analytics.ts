let recordingStartTime: number | null = null;

export function startRecording(): void {
  recordingStartTime = Date.now();
  console.log("[Analytics] Recording started");
}

export function logRecordingMetrics(event: "analysis_complete" | "save_complete"): void {
  if (!recordingStartTime) return;
  const elapsed = Date.now() - recordingStartTime;
  console.log(`[Analytics] ${event}: ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`);
  if (event === "save_complete") {
    recordingStartTime = null;
  }
}
