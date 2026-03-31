import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";
import { parseBackendOutput } from "../backends/output-parser.js";

const DEFAULT_THROTTLE_MS = 300;
const MAX_UPDATE_LENGTH = 4000;

export interface StreamingCallbacks {
  sendInitial: (text: string) => Promise<string>;
  updateMessage: (messageId: string, text: string) => Promise<void>;
  finalize?: () => Promise<void>;
}

export class StreamingExecutor {
  private readonly throttleMs: number;

  constructor(options?: { throttleMs?: number }) {
    this.throttleMs = options?.throttleMs ?? DEFAULT_THROTTLE_MS;
  }

  async execute(
    task: Task,
    backend: ExecutionBackend,
    callbacks?: StreamingCallbacks,
  ): Promise<ExecutionResult> {
    if (!backend.executeStream || !callbacks) {
      return backend.execute(task);
    }

    const stream = backend.executeStream(task);
    const start = Date.now();
    let stdout = "";
    let stderr = "";
    let messageId: string | null = null;
    let lastUpdateTime = 0;
    let lastUpdateContent = "";
    let pendingUpdate = false;

    const doUpdate = async (content: string, force: boolean) => {
      const now = Date.now();
      if (!force && now - lastUpdateTime < this.throttleMs) {
        pendingUpdate = true;
        return;
      }

      const truncated =
        content.length > MAX_UPDATE_LENGTH
          ? content.slice(-MAX_UPDATE_LENGTH)
          : content;

      if (truncated === lastUpdateContent) return;

      if (!messageId) {
        messageId = await callbacks.sendInitial(truncated);
        lastUpdateContent = truncated;
        lastUpdateTime = Date.now();
        pendingUpdate = false;
        return;
      }

      try {
        await callbacks.updateMessage(messageId, truncated);
        lastUpdateContent = truncated;
        lastUpdateTime = Date.now();
        pendingUpdate = false;
      } catch (err) {
        console.error("[StreamingExecutor] updateMessage failed:", err);
      }
    };

    for await (const chunk of stream) {
      switch (chunk.type) {
        case "status":
          await doUpdate(chunk.content, true);
          break;
        case "stdout":
          stdout += chunk.content;
          {
            const parsed = parseBackendOutput(backend.name, stdout);
            if (parsed.trim().length > 0) {
              await doUpdate(parsed, false);
            }
          }
          break;
        case "stderr":
          stderr += chunk.content;
          break;
      }
    }

    const parsed = parseBackendOutput(backend.name, stdout);
    const finalContent =
      parsed.trim() ||
      (stderr.trim() ? `Error:\n${stderr.trim()}` : "");

    if (finalContent) {
      await doUpdate(finalContent, true);
    }

    if (callbacks.finalize) {
      try {
        await callbacks.finalize();
      } catch (err) {
        console.error("[StreamingExecutor] finalize failed:", err);
      }
    }

    return {
      taskId: task.taskId,
      exitCode: 0,
      stdout: parsed,
      stderr,
      duration: Date.now() - start,
    };
  }
}
