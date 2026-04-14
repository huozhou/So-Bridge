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
    backend: "claude-code",
    prompt,
    instructions: [],
    requiresConfirmation: false,
  };
}

function createFakeChild(stdoutData: string, stderrData = "") {
  const stdout = new Readable({ read() {} });
  const stderr = new Readable({ read() {} });
  const child = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    kill: vi.fn(),
    pid: 12345,
  });

  process.nextTick(() => {
    if (stdoutData) stdout.push(Buffer.from(stdoutData));
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

describe("ClaudeCodeBackend", () => {
  let backend: InstanceType<typeof import("../../src/backends/claude-code.js").ClaudeCodeBackend>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { ClaudeCodeBackend } = await import("../../src/backends/claude-code.js");
    backend = new ClaudeCodeBackend();
  });

  it("has name 'claude-code'", () => {
    expect(backend.name).toBe("claude-code");
  });

  it("isAvailable returns true when claude CLI is found", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockResolvedValueOnce({ stdout: "/usr/local/bin/claude" });

    const result = await backend.isAvailable();
    expect(result).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining("claude"));
  });

  it("isAvailable returns false when claude CLI is not found", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockRejectedValueOnce(new Error("not found"));

    const result = await backend.isAvailable();
    expect(result).toBe(false);
  });

  it("execute calls claude with --print and collects streamed output", async () => {
    const { spawn } = await import("node:child_process");
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    const fakeChild = createFakeChild("output text");
    mockSpawn.mockReturnValue(fakeChild);

    const task = makeTask("add a hello endpoint");
    const result = await backend.execute(task);

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["--print", "add a hello endpoint"],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("output text");
    expect(result.taskId).toBe("task-1");
  });

  it("prepends instructions before the user prompt", async () => {
    const { spawn } = await import("node:child_process");
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    const fakeChild = createFakeChild("output text");
    mockSpawn.mockReturnValue(fakeChild);

    const task = makeTask("add a hello endpoint");
    task.instructions = ["# Workspace Whitelist Skill", "Only access /repo/a"];
    await backend.execute(task);

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      [
        "--print",
        expect.stringContaining("# Workspace Whitelist Skill"),
      ],
      expect.any(Object),
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      [
        "--print",
        expect.stringContaining("add a hello endpoint"),
      ],
      expect.any(Object),
    );
  });

  it("execute collects stderr from streamed output", async () => {
    const { spawn } = await import("node:child_process");
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

    const fakeChild = createFakeChild("", "some error");
    mockSpawn.mockReturnValue(fakeChild);

    const task = makeTask();
    const result = await backend.execute(task);

    expect(result.stderr).toBe("some error");
  });

  it("cancel kills the running process", async () => {
    const { spawn } = await import("node:child_process");
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

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
