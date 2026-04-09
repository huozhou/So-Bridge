import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter, Readable } from "node:stream";
import type { Task, TaskContext } from "../../src/types.js";

function makeTask(prompt = "test prompt"): Task {
  const context: TaskContext = {
    intent: {
      action: "add-code",
      parameters: {},
      confidence: 1,
      rawMessage: prompt,
    },
    sessionHistory: [],
  };
  return {
    taskId: "task-1",
    context,
    backend: "cursor",
    prompt,
    instructions: [],
    requiresConfirmation: false,
  };
}

function createStreamJsonChild(events: Record<string, unknown>[], stderrData = "") {
  const stdout = new Readable({ read() {} });
  const stderr = new Readable({ read() {} });
  const child = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    kill: vi.fn(),
    pid: 12345,
  });

  process.nextTick(() => {
    for (const event of events) {
      stdout.push(JSON.stringify(event) + "\n");
    }
    stdout.push(null);
    if (stderrData) stderr.push(Buffer.from(stderrData));
    stderr.push(null);
  });

  return child;
}

vi.mock("node:child_process", () => {
  const mockSpawn = vi.fn();
  const mockExec = vi.fn();
  return { spawn: mockSpawn, exec: mockExec };
});

vi.mock("node:util", () => ({
  promisify: (fn: unknown) => fn,
}));

describe("CursorBackend", () => {
  let backend: InstanceType<typeof import("../../src/backends/cursor.js").CursorBackend>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { CursorBackend } = await import("../../src/backends/cursor.js");
    backend = new CursorBackend();
  });

  it("has name 'cursor'", () => {
    expect(backend.name).toBe("cursor");
  });

  it("isAvailable returns true when agent CLI is found", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockResolvedValueOnce({ stdout: "2026.03.25" });

    const result = await backend.isAvailable();
    expect(result).toBe(true);
  });

  it("isAvailable returns false when agent CLI is not found", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockRejectedValueOnce(new Error("not found"));
    mockExec.mockRejectedValueOnce(new Error("not found"));

    const result = await backend.isAvailable();
    expect(result).toBe(false);
  });

  it("execute parses stream-json and accumulates assistant text", async () => {
    const { exec, spawn } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    mockExec.mockResolvedValueOnce({ stdout: "2026.03.25" });
    await backend.isAvailable();

    const events = [
      { type: "system", subtype: "init", model: "claude-sonnet" },
      { type: "assistant", message: { content: [{ text: "Hello" }] } },
      { type: "assistant", message: { content: [{ text: " World" }] } },
      { type: "result", duration_ms: 500 },
    ];
    mockSpawn.mockReturnValue(createStreamJsonChild(events));

    const task = makeTask("say hello");
    const result = await backend.execute(task);

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      ["-p", "--output-format", "stream-json", "--stream-partial-output", "say hello"],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Hello World");
    expect(result.taskId).toBe("task-1");
  });

  it("prepends instructions before the user prompt", async () => {
    const { exec, spawn } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    mockExec.mockResolvedValueOnce({ stdout: "2026.03.25" });
    await backend.isAvailable();

    mockSpawn.mockReturnValue(createStreamJsonChild([]));

    const task = makeTask("say hello");
    task.instructions = ["# Workspace Whitelist Skill", "Only access /repo/a"];
    await backend.execute(task);

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      [
        "-p",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        expect.stringContaining("# Workspace Whitelist Skill"),
      ],
      expect.any(Object),
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      [
        "-p",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        expect.stringContaining("say hello"),
      ],
      expect.any(Object),
    );
  });

  it("execute collects stderr", async () => {
    const { exec, spawn } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    mockExec.mockResolvedValueOnce({ stdout: "2026.03.25" });
    await backend.isAvailable();

    mockSpawn.mockReturnValue(createStreamJsonChild([], "cursor error"));

    const task = makeTask();
    const result = await backend.execute(task);

    expect(result.stderr).toBe("cursor error");
  });

  it("cancel kills the running process", async () => {
    const { exec, spawn } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    mockExec.mockResolvedValueOnce({ stdout: "2026.03.25" });
    await backend.isAvailable();

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    const fakeChild = Object.assign(new EventEmitter(), {
      stdout,
      stderr,
      kill: vi.fn(() => {
        stdout.push(null);
        stderr.push(null);
      }),
      pid: 12345,
    });
    mockSpawn.mockReturnValue(fakeChild);

    const task = makeTask();
    const executePromise = backend.execute(task);

    await new Promise((r) => setTimeout(r, 10));
    await backend.cancel("task-1");
    expect(fakeChild.kill).toHaveBeenCalled();

    await executePromise;
  });
});
