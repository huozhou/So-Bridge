#!/usr/bin/env node

import { rm } from "node:fs/promises";

import { getSoBridgePaths, type SoBridgePaths } from "../app-paths.js";
import { CLI_VERSION } from "../../generated/version.js";
import {
  buildAdminUrl,
  buildHealthUrl,
  resolveServerBinding,
  type ServerBinding,
} from "../server/server-binding.js";
import { SoBridgeStore } from "../storage/so-bridge-store.js";
import { getBrowserOpenFailureMessage, openInBrowser } from "./browser.js";
import { runConfigCommand } from "./commands/config.js";
import { runOpenCommand } from "./commands/open.js";
import { runPurgeCommand } from "./commands/purge.js";
import { runStartCommand } from "./commands/start.js";
import { runStatusCommand, type CliStatus } from "./commands/status.js";
import { runStopCommand } from "./commands/stop.js";

export interface CliDeps {
  print: (line: string) => void;
  statusProvider: () => Promise<CliStatus>;
  purge: () => Promise<void>;
  setConfigPort?: (port: number) => Promise<void>;
  start?: (options: { port?: number }) => Promise<void>;
  stop?: () => Promise<void>;
  openUrl?: (url: string) => Promise<void>;
  setExitCode?: (code: number) => void;
}

type CliCommandName = "config" | "start" | "status" | "open" | "stop" | "purge";

type CliCommandDefinition = {
  name: CliCommandName;
  summary: string;
  usage: string;
};

const CLI_COMMANDS: CliCommandDefinition[] = [
  {
    name: "config",
    summary: "Manage local CLI settings",
    usage: "so-bridge config set port <number>",
  },
  {
    name: "start",
    summary: "Start the bridge service",
    usage: "so-bridge start [--port <number>]",
  },
  {
    name: "status",
    summary: "Show current bridge state",
    usage: "so-bridge status",
  },
  {
    name: "open",
    summary: "Open the admin console",
    usage: "so-bridge open",
  },
  {
    name: "stop",
    summary: "Show stop guidance for foreground mode",
    usage: "so-bridge stop",
  },
  {
    name: "purge",
    summary: "Remove local config and state",
    usage: "so-bridge purge",
  },
];

function createDefaultCliDeps(): CliDeps {
  const paths = getSoBridgePaths();

  return {
    print: console.log,
    statusProvider: async () =>
      readStatusFromLocalStore(paths, {
        probeRuntimeReachability: probeRuntimeReachability,
      }),
    purge: async () => {
      await rm(paths.configDir, { recursive: true, force: true });
      await rm(paths.dataDir, { recursive: true, force: true });
      await rm(paths.logDir, { recursive: true, force: true });
    },
    setConfigPort: async (port) => {
      const store = new SoBridgeStore(paths);
      const { config } = await store.readAll();
      config.server.port = port;
      await store.writeConfig(config);
    },
    openUrl: openInBrowser,
    setExitCode: (code: number) => {
      process.exitCode = code;
    },
    start: async (options) => {
      const { startSoBridgeServer } = await import("../index.js");
      await startSoBridgeServer(options);
    },
  };
}

export async function runCli(argv: string[], deps: CliDeps): Promise<void> {
  const [command, ...args] = argv;
  const subcommandOrFlag = args[0];

  try {
    if (!command || command === "--help" || command === "-h" || command === "help") {
      printMainHelp(deps.print);
      return;
    }

    if (command === "--version" || command === "-v") {
      deps.print(`so-bridge ${CLI_VERSION}`);
      return;
    }

    if (isKnownCommand(command) && (subcommandOrFlag === "--help" || subcommandOrFlag === "-h")) {
      printCommandHelp(command, deps.print);
      return;
    }

    if (command === "status") {
      await runStatusCommand(deps);
      return;
    }

    if (command === "config") {
      await runConfigCommand({
        args,
        parsePort: parseCliPort,
        print: deps.print,
        setPort: deps.setConfigPort,
      });
      return;
    }

    if (command === "purge") {
      await runPurgeCommand(deps);
      return;
    }

    if (command === "start") {
      const options = parseStartOptions(args);
      await runStartCommand({
        port: options.port,
        print: deps.print,
        start: deps.start,
      });
      return;
    }

    if (command === "stop") {
      await runStopCommand(deps);
      return;
    }

    if (command === "open") {
      await runOpenCommand({
        openUrl: async (url) => {
          try {
            await (deps.openUrl ?? openInBrowser)(url);
          } catch {
            throw new Error(getBrowserOpenFailureMessage(url));
          }
        },
        print: deps.print,
        statusProvider: deps.statusProvider,
      });
      return;
    }

    deps.print(`Unknown command: ${command}`);
    deps.print("Run 'so-bridge --help' to see available commands.");
    deps.setExitCode?.(1);
  } catch (error) {
    deps.print(error instanceof Error ? error.message : String(error));
    deps.setExitCode?.(1);
  }
}

function isKnownCommand(value: string): value is CliCommandName {
  return CLI_COMMANDS.some((command) => command.name === value);
}

function printMainHelp(print: (line: string) => void): void {
  print("so-bridge");
  print("Local bridge connecting chat platforms to AI coding assistants.");
  print("");
  print("Usage:");
  print("  so-bridge <command> [options]");
  print("");
  print("Commands:");
  for (const command of CLI_COMMANDS) {
    print(`  ${command.name.padEnd(8)} ${command.summary}`);
  }
  print("");
  print("Options:");
  print("  -h, --help       Show help");
  print("  -v, --version    Show version");
}

function printCommandHelp(commandName: CliCommandName, print: (line: string) => void): void {
  const command = CLI_COMMANDS.find((item) => item.name === commandName);
  if (!command) {
    return;
  }

  print(`so-bridge ${command.name}`);
  print(command.summary);
  print("");
  print("Usage:");
  print(`  ${command.usage}`);
  if (command.name === "config") {
    print("");
    print("Commands:");
    print("  so-bridge config set port <number>");
  }
}

export async function readStatusFromLocalStore(
  paths: SoBridgePaths = getSoBridgePaths(),
  options: {
    probeRuntimeReachability?: (urls: {
      adminUrl: string | null;
      healthUrl: string | null;
    }) => Promise<boolean>;
  } = {},
): Promise<CliStatus> {
  const store = new SoBridgeStore(paths);
  const snapshot = await store.readAll();
  const activeProfile =
    snapshot.state.activeBridgeProfileId === null
      ? null
      : snapshot.config.bridgeProfiles.find((profile) => profile.id === snapshot.state.activeBridgeProfileId) ?? null;
  const savedBinding = resolveServerBinding(snapshot.config);
  const runtimeBinding = toRuntimeBinding(snapshot.state.runtimeServer);
  const runtimeAdminUrl = runtimeBinding ? buildAdminUrl(runtimeBinding) : null;
  const runtimeHealthUrl = runtimeBinding ? buildHealthUrl(runtimeBinding) : null;

  return {
    activeBridgeProfileName: activeProfile?.name ?? null,
    directoryMode: snapshot.config.directoryPolicy.mode,
    selectedPath: snapshot.config.directoryPolicy.selectedPath,
    savedPort: savedBinding.port,
    runtimePort: runtimeBinding?.port ?? null,
    runtimeReachable: options.probeRuntimeReachability
      ? await options.probeRuntimeReachability({
          adminUrl: runtimeAdminUrl,
          healthUrl: runtimeHealthUrl,
        })
      : false,
    savedAdminUrl: buildAdminUrl(savedBinding),
    runtimeAdminUrl,
    configFile: paths.configFile,
    stateFile: paths.stateFile,
  };
}

function parseStartOptions(args: string[]): { port?: number } {
  if (args.length === 0) {
    return {};
  }

  const [flag, value] = args;
  if (flag === "--port" && args.length === 2) {
    return { port: parseCliPort(value) };
  }

  throw new Error("Usage: so-bridge start [--port <number>]");
}

function parseCliPort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return port;
}

function toRuntimeBinding(
  runtimeServer: {
    host: string;
    port: number;
  } | null,
): ServerBinding | null {
  if (!runtimeServer) {
    return null;
  }

  return {
    host: runtimeServer.host,
    port: runtimeServer.port,
  };
}

async function probeRuntimeReachability(urls: {
  adminUrl: string | null;
  healthUrl: string | null;
}): Promise<boolean> {
  if (!urls.healthUrl) {
    return false;
  }

  try {
    const response = await fetch(urls.healthUrl);
    if (!response.ok) {
      return false;
    }

    return isSoBridgeHealthPayload(await response.json());
  } catch {
    return false;
  }
}

function isSoBridgeHealthPayload(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const value = payload as Record<string, unknown>;
  const server = value.server;

  return (
    value.status === "ok" &&
    Array.isArray(value.backends) &&
    value.backends.every((item) => typeof item === "string") &&
    Array.isArray(value.platforms) &&
    value.platforms.every((item) => typeof item === "string") &&
    typeof value.configPath === "string" &&
    typeof value.statePath === "string" &&
    typeof server === "object" &&
    server !== null &&
    typeof (server as { host?: unknown }).host === "string" &&
    typeof (server as { port?: unknown }).port === "number" &&
    Number.isInteger((server as { port: number }).port)
  );
}

export { probeRuntimeReachability };

if (typeof require !== "undefined" && require.main === module) {
  void runCli(process.argv.slice(2), createDefaultCliDeps());
}
