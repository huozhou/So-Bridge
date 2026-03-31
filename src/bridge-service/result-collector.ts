import type { ExecutionResult } from "../types.js";

function clampDuration(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export class ResultCollector {
  collect(result: ExecutionResult): ExecutionResult {
    const exitCode = Number.isInteger(result.exitCode) ? result.exitCode : -1;
    const stdout = typeof result.stdout === "string" ? result.stdout : String(result.stdout ?? "");
    const stderr = typeof result.stderr === "string" ? result.stderr : String(result.stderr ?? "");
    const normalized: ExecutionResult = {
      taskId: result.taskId,
      exitCode,
      stdout,
      stderr,
      duration: clampDuration(result.duration),
    };
    if (result.diff !== undefined) {
      normalized.diff = typeof result.diff === "string" ? result.diff : String(result.diff);
    }
    if (result.filesChanged !== undefined) {
      normalized.filesChanged = Array.isArray(result.filesChanged)
        ? result.filesChanged.map(String)
        : [];
    }
    return normalized;
  }

  async collectStream(taskId: string, stream: AsyncIterable<string>): Promise<ExecutionResult> {
    const started = Date.now();
    let stdout = "";
    for await (const chunk of stream) {
      stdout += typeof chunk === "string" ? chunk : String(chunk);
    }
    const duration = Date.now() - started;
    return this.collect({
      taskId,
      exitCode: 0,
      stdout,
      stderr: "",
      duration,
    });
  }
}
