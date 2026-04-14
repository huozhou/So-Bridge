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
        savedPort: 3000,
        runtimePort: 3100,
        runtimeReachable: true,
        savedAdminUrl: "http://127.0.0.1:3000/admin",
        runtimeAdminUrl: "http://127.0.0.1:3100/admin",
        configFile: "/cfg/config.json",
        stateFile: "/data/state.json",
      }),
      purge: vi.fn(),
    });

    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Slack -> Codex"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("/repo/a"));
    expect(stdout).toHaveBeenCalledWith("Saved port: 3000");
    expect(stdout).toHaveBeenCalledWith("Runtime port: 3100");
    expect(stdout).toHaveBeenCalledWith("Temporary port override active");
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

  it("opens the runtime admin when the runtime port is reachable", async () => {
    const openUrl = vi.fn().mockResolvedValue(undefined);
    const print = vi.fn();

    await runCli(["open"], {
      print,
      purge: vi.fn(),
      statusProvider: async () => ({
        activeBridgeProfileName: null,
        directoryMode: "open",
        selectedPath: null,
        savedPort: 3000,
        runtimePort: 3100,
        runtimeReachable: true,
        savedAdminUrl: "http://127.0.0.1:3000/admin",
        runtimeAdminUrl: "http://127.0.0.1:3100/admin",
      }),
      openUrl,
    } as any);

    expect(openUrl).toHaveBeenCalledWith("http://127.0.0.1:3100/admin");
    expect(print).toHaveBeenCalledWith("Opened http://127.0.0.1:3100/admin");
  });

  it("falls back to the saved admin when the runtime port is not reachable", async () => {
    const openUrl = vi.fn().mockResolvedValue(undefined);
    const print = vi.fn();
    await runCli(["open"], {
      print,
      purge: vi.fn(),
      statusProvider: async () => ({
        activeBridgeProfileName: null,
        directoryMode: "open",
        selectedPath: null,
        savedPort: 3000,
        runtimePort: 3100,
        runtimeReachable: false,
        savedAdminUrl: "http://127.0.0.1:3000/admin",
        runtimeAdminUrl: "http://127.0.0.1:3100/admin",
      }),
      openUrl,
    } as any);

    expect(openUrl).toHaveBeenCalledWith("http://127.0.0.1:3000/admin");
    expect(print).toHaveBeenCalledWith(
      "Runtime admin is unreachable. Opened configured admin URL: http://127.0.0.1:3000/admin",
    );
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

    expect(start).toHaveBeenCalledWith({});
  });

  it("passes a validated port override to start", async () => {
    const start = vi.fn().mockResolvedValue(undefined);

    await runCli(["start", "--port", "4200"], {
      print: vi.fn(),
      purge: vi.fn(),
      statusProvider: vi.fn(),
      start,
    } as any);

    expect(start).toHaveBeenCalledWith({ port: 4200 });
  });

  it.each(["0", "65536", "3.14", "abc"])("rejects invalid start port %p", async (portValue) => {
    const print = vi.fn();
    const setExitCode = vi.fn();
    const start = vi.fn();

    await runCli(["start", "--port", portValue], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      setExitCode,
      start,
    } as any);

    expect(print).toHaveBeenCalledWith("Port must be an integer between 1 and 65535.");
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("saves a validated port via config set port", async () => {
    const print = vi.fn();
    const setConfigPort = vi.fn().mockResolvedValue(undefined);

    await runCli(["config", "set", "port", "4300"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      setConfigPort,
    } as any);

    expect(setConfigPort).toHaveBeenCalledWith(4300);
    expect(print).toHaveBeenCalledWith("Saved port: 4300");
  });

  it("rejects config set port with trailing args", async () => {
    const print = vi.fn();
    const setExitCode = vi.fn();
    const setConfigPort = vi.fn();

    await runCli(["config", "set", "port", "4300", "extra"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      setExitCode,
      setConfigPort,
    } as any);

    expect(print).toHaveBeenCalledWith("Usage: so-bridge config set port <number>");
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(setConfigPort).not.toHaveBeenCalled();
  });

  it("prints help for config --help", async () => {
    const print = vi.fn();

    await runCli(["config", "--help"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
    } as any);

    expect(print).toHaveBeenCalledWith("so-bridge config");
    expect(print).toHaveBeenCalledWith(expect.stringContaining("config set port"));
  });

  it("rejects invalid config port values", async () => {
    const print = vi.fn();
    const setExitCode = vi.fn();
    const setConfigPort = vi.fn();

    await runCli(["config", "set", "port", "70000"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      setExitCode,
      setConfigPort,
    } as any);

    expect(print).toHaveBeenCalledWith("Port must be an integer between 1 and 65535.");
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(setConfigPort).not.toHaveBeenCalled();
  });

  it("rejects missing config port values", async () => {
    const print = vi.fn();
    const setExitCode = vi.fn();
    const setConfigPort = vi.fn();

    await runCli(["config", "set", "port"], {
      print,
      purge: vi.fn(),
      statusProvider: vi.fn(),
      setExitCode,
      setConfigPort,
    } as any);

    expect(print).toHaveBeenCalledWith("Usage: so-bridge config set port <number>");
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(setConfigPort).not.toHaveBeenCalled();
  });

  it("prints stale runtime status explicitly when runtime is unreachable", async () => {
    const stdout = vi.fn();

    await runCli(["status"], {
      print: stdout,
      statusProvider: async () => ({
        activeBridgeProfileName: "Slack -> Codex",
        directoryMode: "restricted",
        selectedPath: "/repo/a",
        savedPort: 3000,
        runtimePort: 3100,
        runtimeReachable: false,
        savedAdminUrl: "http://127.0.0.1:3000/admin",
        runtimeAdminUrl: "http://127.0.0.1:3100/admin",
      }),
      purge: vi.fn(),
    });

    expect(stdout).toHaveBeenCalledWith("Runtime port: 3100 (stale/unreachable)");
    expect(stdout).not.toHaveBeenCalledWith("Temporary port override active");
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
            server: {
              port: 3300,
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
            runtimeServer: {
              host: "127.0.0.1",
              port: 3400,
              startedAt: "2026-04-14T00:00:00.000Z",
            },
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
        savedPort: 3300,
        runtimePort: 3400,
        runtimeReachable: false,
        savedAdminUrl: "http://127.0.0.1:3300/admin",
        runtimeAdminUrl: "http://127.0.0.1:3400/admin",
        configFile: paths.configFile,
        stateFile: paths.stateFile,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
