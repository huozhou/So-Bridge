import { describe, it, expect, vi } from "vitest";
import { StreamingExecutor } from "../../src/bridge-service/streaming-executor.js";
import type { ExecutionBackend, ExecutionResult, StreamChunk, Task, TaskContext } from "../../src/types.js";

function makeTask(): Task {
  const context: TaskContext = {
    intent: { action: "run-command", parameters: {}, confidence: 1, rawMessage: "test" },
    sessionHistory: [],
  };
  return { taskId: "t-1", context, backend: "test", prompt: "test", requiresConfirmation: false };
}

function stubBackend(chunks: StreamChunk[]): ExecutionBackend {
  return {
    name: "test",
    isAvailable: vi.fn().mockResolvedValue(true),
    execute: vi.fn().mockResolvedValue({
      taskId: "t-1", exitCode: 0, stdout: "fallback", stderr: "", duration: 1,
    } satisfies ExecutionResult),
    async *executeStream() {
      for (const c of chunks) yield c;
    },
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

describe("StreamingExecutor", () => {
  it("falls back to execute() when no streaming callbacks provided", async () => {
    const backend = stubBackend([]);
    const executor = new StreamingExecutor();

    const result = await executor.execute(makeTask(), backend);

    expect(backend.execute).toHaveBeenCalled();
    expect(result.stdout).toBe("fallback");
  });

  it("falls back to execute() when backend has no executeStream", async () => {
    const backend: ExecutionBackend = {
      name: "no-stream",
      isAvailable: vi.fn().mockResolvedValue(true),
      execute: vi.fn().mockResolvedValue({
        taskId: "t-1", exitCode: 0, stdout: "no-stream", stderr: "", duration: 1,
      } satisfies ExecutionResult),
      cancel: vi.fn(),
    };
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor();

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(result.stdout).toBe("no-stream");
  });

  it("sends initial message on first status chunk", async () => {
    const chunks: StreamChunk[] = [
      { type: "status", content: "Thinking...", timestamp: 1 },
      { type: "stdout", content: "hello", timestamp: 2 },
    ];
    const backend = stubBackend(chunks);
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor({ throttleMs: 0 });

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(callbacks.sendInitial).toHaveBeenCalledWith("Thinking...");
    expect(result.stdout).toBe("hello");
  });

  it("calls updateMessage with accumulated stdout", async () => {
    const chunks: StreamChunk[] = [
      { type: "status", content: "Starting...", timestamp: 1 },
      { type: "stdout", content: "part1", timestamp: 2 },
      { type: "stdout", content: "part2", timestamp: 3 },
    ];
    const backend = stubBackend(chunks);
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor({ throttleMs: 0 });

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(result.stdout).toBe("part1part2");
    const lastUpdateCall = callbacks.updateMessage.mock.calls.at(-1);
    expect(lastUpdateCall?.[0]).toBe("msg-1");
    expect(lastUpdateCall?.[1]).toContain("part1part2");
  });

  it("collects stderr separately without updating message", async () => {
    const chunks: StreamChunk[] = [
      { type: "status", content: "Go", timestamp: 1 },
      { type: "stderr", content: "warning!", timestamp: 2 },
      { type: "stdout", content: "ok", timestamp: 3 },
    ];
    const backend = stubBackend(chunks);
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor({ throttleMs: 0 });

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(result.stderr).toBe("warning!");
    expect(result.stdout).toBe("ok");
  });

  it("always forces a final update when only stderr exists", async () => {
    const chunks: StreamChunk[] = [
      { type: "status", content: "Codex is thinking...", timestamp: 1 },
      { type: "stderr", content: "some warning", timestamp: 2 },
    ];
    const backend = stubBackend(chunks);
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor({ throttleMs: 0 });

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(callbacks.sendInitial).toHaveBeenCalledWith("Codex is thinking...");
    expect(callbacks.updateMessage).toHaveBeenCalled();
    const lastCall = callbacks.updateMessage.mock.calls.at(-1);
    expect(lastCall?.[1]).toContain("some warning");
    expect(callbacks.finalize).toHaveBeenCalled();
    expect(result.stderr).toBe("some warning");
  });

  it("always pushes final stdout result even if not throttled", async () => {
    const chunks: StreamChunk[] = [
      { type: "status", content: "Thinking...", timestamp: 1 },
      { type: "stdout", content: "final answer", timestamp: 2 },
    ];
    const backend = stubBackend(chunks);
    const callbacks = {
      sendInitial: vi.fn().mockResolvedValue("msg-1"),
      updateMessage: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new StreamingExecutor({ throttleMs: 0 });

    const result = await executor.execute(makeTask(), backend, callbacks);

    expect(result.stdout).toBe("final answer");
    const lastCall = callbacks.updateMessage.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe("final answer");
    expect(callbacks.finalize).toHaveBeenCalled();
  });
});
