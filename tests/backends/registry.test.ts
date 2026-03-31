import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExecutionBackend, ExecutionResult } from "../../src/types.js";

function stubBackend(name: string, available = true): ExecutionBackend {
  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(available),
    execute: vi.fn().mockResolvedValue({
      taskId: "t",
      exitCode: 0,
      stdout: "",
      stderr: "",
      duration: 0,
    } satisfies ExecutionResult),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BackendRegistry", () => {
  it("registers and retrieves backends by name", async () => {
    const { BackendRegistry } = await import("../../src/backends/index.js");
    const a = stubBackend("codex-cli");
    const b = stubBackend("claude-code");
    const reg = new BackendRegistry([a, b]);

    expect(reg.get("codex-cli")).toBe(a);
    expect(reg.get("claude-code")).toBe(b);
    expect(reg.get("nonexistent")).toBeUndefined();
  });

  it("getAvailable filters by isAvailable()", async () => {
    const { BackendRegistry } = await import("../../src/backends/index.js");
    const a = stubBackend("codex-cli", true);
    const b = stubBackend("claude-code", false);
    const c = stubBackend("cursor", true);
    const reg = new BackendRegistry([a, b, c]);

    const available = await reg.getAvailable();
    expect(available).toEqual(["codex-cli", "cursor"]);
  });

  it("toMap returns a copy", async () => {
    const { BackendRegistry } = await import("../../src/backends/index.js");
    const a = stubBackend("codex-cli");
    const reg = new BackendRegistry([a]);
    const map = reg.toMap();

    expect(map.get("codex-cli")).toBe(a);
    expect(map.size).toBe(1);
  });
});

describe("createDefaultBackends", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers claude-code when claudeCodeEnabled is true", async () => {
    vi.mock("../../src/backends/codex-cli.js", () => ({
      CodexCliBackend: class { name = "codex-cli"; },
    }));
    vi.mock("../../src/backends/claude-code.js", () => ({
      ClaudeCodeBackend: class { name = "claude-code"; },
    }));
    vi.mock("../../src/backends/cursor.js", () => ({
      CursorBackend: class { name = "cursor"; },
    }));
    vi.mock("../../src/backends/vscode-agent.js", () => ({
      VSCodeAgentBackend: class {
        name = "vscode-agent";
        constructor(_opts?: any) {}
      },
    }));
    vi.mock("../../src/backends/cloud-sandbox.js", () => ({
      CloudSandboxBackend: class {
        name = "cloud-sandbox";
        constructor(_opts?: any) {}
      },
    }));

    const { createDefaultBackends } = await import("../../src/backends/index.js");

    const registry = createDefaultBackends({
      codexEnabled: true,
      claudeCodeEnabled: true,
      cursorEnabled: false,
    });

    expect(registry.get("codex-cli")).toBeDefined();
    expect(registry.get("claude-code")).toBeDefined();
    expect(registry.get("cursor")).toBeUndefined();
    expect(registry.get("vscode-agent")).toBeDefined();
  });

  it("registers cursor when cursorEnabled is true", async () => {
    vi.mock("../../src/backends/codex-cli.js", () => ({
      CodexCliBackend: class { name = "codex-cli"; },
    }));
    vi.mock("../../src/backends/claude-code.js", () => ({
      ClaudeCodeBackend: class { name = "claude-code"; },
    }));
    vi.mock("../../src/backends/cursor.js", () => ({
      CursorBackend: class { name = "cursor"; },
    }));
    vi.mock("../../src/backends/vscode-agent.js", () => ({
      VSCodeAgentBackend: class {
        name = "vscode-agent";
        constructor(_opts?: any) {}
      },
    }));
    vi.mock("../../src/backends/cloud-sandbox.js", () => ({
      CloudSandboxBackend: class {
        name = "cloud-sandbox";
        constructor(_opts?: any) {}
      },
    }));

    const { createDefaultBackends } = await import("../../src/backends/index.js");

    const registry = createDefaultBackends({
      codexEnabled: false,
      claudeCodeEnabled: false,
      cursorEnabled: true,
    });

    expect(registry.get("codex-cli")).toBeUndefined();
    expect(registry.get("claude-code")).toBeUndefined();
    expect(registry.get("cursor")).toBeDefined();
  });
});
