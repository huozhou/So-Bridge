import { describe, expect, it, vi } from "vitest";

import { runCli } from "../../src/cli/index.js";

describe("runCli", () => {
  it("prints status for the active profile", async () => {
    const stdout = vi.fn();
    await runCli(["status"], {
      print: stdout,
      statusProvider: async () => ({
        activeBridgeProfileName: "Slack -> Codex",
        directoryMode: "restricted",
        selectedPath: "/repo/a",
        configFile: "/cfg/config.json",
        stateFile: "/data/state.json",
      }),
      purge: vi.fn(),
    });

    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Slack -> Codex"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("/repo/a"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("/cfg/config.json"));
  });

  it("routes purge to the cleanup command", async () => {
    const purge = vi.fn().mockResolvedValue(undefined);
    await runCli(["purge"], {
      purge,
      print: vi.fn(),
      statusProvider: vi.fn(),
    });

    expect(purge).toHaveBeenCalledTimes(1);
  });

  it("opens admin only when the bridge is reachable", async () => {
    const openUrl = vi.fn().mockResolvedValue(undefined);
    const print = vi.fn();

    await runCli(["open"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      isReachable: vi.fn().mockResolvedValue(true),
      openUrl,
      url: "http://127.0.0.1:3000/admin",
    } as any);

    expect(openUrl).toHaveBeenCalledWith("http://127.0.0.1:3000/admin");
  });

  it("returns an explicit unsupported message for stop", async () => {
    const print = vi.fn();
    await runCli(["stop"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(print).toHaveBeenCalledWith(expect.stringContaining("not implemented"));
  });

  it("routes start through the startup dependency", async () => {
    const start = vi.fn().mockResolvedValue(undefined);

    await runCli(["start"], {
      print: vi.fn(),
      purge: vi.fn(),
      statusProvider: vi.fn(),
      start,
    } as any);

    expect(start).toHaveBeenCalledTimes(1);
  });
});
