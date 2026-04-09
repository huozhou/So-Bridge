import { describe, it, expect, vi } from "vitest";
import { TaskDispatcher } from "../../src/bridge-service/task-dispatcher.js";
import type { ExecutionBackend, ExecutionResult, TaskContext } from "../../src/types.js";

function stubBackend(name: string, available = true): ExecutionBackend {
  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(available),
    execute: vi.fn().mockResolvedValue({
      taskId: "t",
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      duration: 100,
    } satisfies ExecutionResult),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

function makeContext(action = "add-code" as const): TaskContext {
  return {
    intent: {
      action,
      parameters: {},
      confidence: 1,
      rawMessage: "test message",
    },
    sessionHistory: [],
  };
}

describe("TaskDispatcher with defaultBackend", () => {
  it("dispatch uses defaultBackend for all actions", async () => {
    const claude = stubBackend("claude-code");
    const codex = stubBackend("codex-cli");
    const backends = new Map([
      ["claude-code", claude],
      ["codex-cli", codex],
    ]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "claude-code",
    });

    const task = await dispatcher.dispatch(makeContext("run-tests"));
    expect(task.backend).toBe("claude-code");
  });

  it("dispatch throws when defaultBackend is unavailable instead of silent fallback", async () => {
    const claude = stubBackend("claude-code", false);
    const codex = stubBackend("codex-cli", true);
    const backends = new Map([
      ["claude-code", claude],
      ["codex-cli", codex],
    ]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "claude-code",
    });

    await expect(dispatcher.dispatch(makeContext())).rejects.toThrow(
      /claude-code.*not available/,
    );
  });

  it("dispatch throws when defaultBackend is not registered", async () => {
    const codex = stubBackend("codex-cli", true);
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "nonexistent",
    });

    await expect(dispatcher.dispatch(makeContext())).rejects.toThrow(
      /not registered/,
    );
  });

  it("dispatchAdhoc uses provided backendType preference", async () => {
    const codex = stubBackend("codex-cli");
    const claude = stubBackend("claude-code");
    const backends = new Map([
      ["codex-cli", codex],
      ["claude-code", claude],
    ]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    const task = await dispatcher.dispatchAdhoc(
      makeContext(),
      "npm test",
      "claude-code",
      false,
    );
    expect(task.backend).toBe("claude-code");
  });

  it("dispatchAdhoc rejects commands with disallowed whitelist paths", async () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
      validateCommand: () => ({
        allowed: false,
        rejectedPaths: ["/private/repo"],
        reason: "command includes disallowed paths",
      }),
    });

    await expect(
      dispatcher.dispatchAdhoc(
        makeContext(),
        "cat /private/repo/secrets.txt",
        "codex-cli",
        false,
      ),
    ).rejects.toThrow("Whitelist validation failed: command includes disallowed paths");
  });

  it("execute runs the task on the assigned backend", async () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    const task = await dispatcher.dispatch(makeContext());
    const result = await dispatcher.execute(task);

    expect(codex.execute).toHaveBeenCalled();
    expect(result.exitCode).toBe(0);
  });

  it("getDefaultBackend returns the configured default", () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    expect(dispatcher.getDefaultBackend()).toBe("codex-cli");
  });

  it("dispatch generates a prompt from context", async () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    const context = makeContext("review-pr");
    const task = await dispatcher.dispatch(context);

    expect(task.prompt).toContain("Action: review-pr");
    expect(task.prompt).toContain("User message: test message");
  });

  it("dispatch uses a conversational prompt for unknown intents", async () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    const context = makeContext("unknown");
    const task = await dispatcher.dispatch(context);

    expect(task.prompt).not.toContain("Action: unknown");
    expect(task.prompt).toContain("User message: test message");
    expect(task.prompt).toContain("Respond directly to the user");
  });

  it("dispatch sets requiresConfirmation for add-code and fix-bug", async () => {
    const codex = stubBackend("codex-cli");
    const backends = new Map([["codex-cli", codex]]);

    const dispatcher = new TaskDispatcher({
      backends,
      defaultBackend: "codex-cli",
    });

    const addTask = await dispatcher.dispatch(makeContext("add-code"));
    expect(addTask.requiresConfirmation).toBe(true);

    const fixTask = await dispatcher.dispatch(makeContext("fix-bug"));
    expect(fixTask.requiresConfirmation).toBe(true);

    const reviewTask = await dispatcher.dispatch(makeContext("review-pr"));
    expect(reviewTask.requiresConfirmation).toBe(false);
  });
});
