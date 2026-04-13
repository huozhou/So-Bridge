import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import packageJson from "../../package.json";
import { CLI_VERSION } from "../../generated/version.js";
import type { SoBridgePaths } from "../../src/app-paths.js";
import { readStatusFromLocalStore, runCli } from "../../src/cli/index.js";

describe("runCli", () => {
  it("prints main help for --help", async () => {
    const print = vi.fn();

    await runCli(["--help"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(print).toHaveBeenCalledWith("so-bridge");
    expect(print).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(print).toHaveBeenCalledWith(expect.stringContaining("start"));
    expect(print).toHaveBeenCalledWith(expect.stringContaining("--version"));
  });

  it("prints version for --version", async () => {
    const print = vi.fn();

    await runCli(["--version"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(CLI_VERSION).toBe(packageJson.version);
    expect(print).toHaveBeenCalledWith(`so-bridge ${packageJson.version}`);
  });

  it("prints command help for subcommand --help", async () => {
    const print = vi.fn();

    await runCli(["stop", "--help"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(print).toHaveBeenCalledWith("so-bridge stop");
    expect(print).toHaveBeenCalledWith(expect.stringContaining("foreground mode"));
    expect(print).toHaveBeenCalledWith(expect.stringContaining("so-bridge stop"));
  });

  it("prints a clear message for unknown commands", async () => {
    const print = vi.fn();
    const setExitCode = vi.fn();

    await runCli(["wat"], {
      print,
      setExitCode,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(print).toHaveBeenCalledWith("Unknown command: wat");
    expect(print).toHaveBeenCalledWith("Run 'so-bridge --help' to see available commands.");
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

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

  it("prints a clean message when open fails", async () => {
    const print = vi.fn();
    const setExitCode = vi.fn();

    await runCli(["open"], {
      print,
      setExitCode,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      isReachable: vi.fn().mockResolvedValue(false),
      openUrl: vi.fn(),
      url: "http://127.0.0.1:3000/admin",
    } as any);

    expect(print).toHaveBeenCalledWith(
      "Cannot open admin because the local bridge is not running on http://127.0.0.1:3000/admin",
    );
    expect(setExitCode).toHaveBeenCalledWith(1);
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

describe("readStatusFromLocalStore", () => {
  it("reads the active profile and directory policy from local files", async () => {
    const root = await mkdtemp(join(tmpdir(), "so-bridge-cli-status-"));
    const paths: SoBridgePaths = {
      configDir: join(root, "config"),
      dataDir: join(root, "data"),
      logDir: join(root, "logs"),
      configFile: join(root, "config", "config.json"),
      stateFile: join(root, "data", "state.json"),
    };

    try {
      await mkdir(paths.configDir, { recursive: true });
      await mkdir(paths.dataDir, { recursive: true });
      await writeFile(
        paths.configFile,
        `${JSON.stringify(
          {
            botIntegrations: [
              {
                id: "bot-1",
                name: "Slack",
                platform: "slack",
                config: {
                  botToken: "xoxb-test",
                  appToken: "xapp-test",
                },
              },
            ],
            aiAssistants: [
              {
                id: "assistant-1",
                name: "Codex CLI",
                provider: "codex-cli",
                config: {},
              },
            ],
            bridgeProfiles: [
              {
                id: "profile-1",
                name: "Slack -> Codex",
                botIntegrationId: "bot-1",
                aiAssistantId: "assistant-1",
              },
            ],
            directoryPolicy: {
              mode: "restricted",
              allowedPaths: ["/repo/a"],
              selectedPath: "/repo/a",
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      await writeFile(
        paths.stateFile,
        `${JSON.stringify(
          {
            activeBridgeProfileId: "profile-1",
            lastAppliedAt: null,
            lastError: null,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      const status = await readStatusFromLocalStore(paths);

      expect(status).toEqual({
        activeBridgeProfileName: "Slack -> Codex",
        directoryMode: "restricted",
        selectedPath: "/repo/a",
        configFile: paths.configFile,
        stateFile: paths.stateFile,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
