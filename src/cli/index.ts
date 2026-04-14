#!/usr/bin/env node

import { rm } from "node:fs/promises";

import { getSoBridgePaths, type SoBridgePaths } from "../app-paths.js";
import { CLI_VERSION } from "../../generated/version.js";
import { SoBridgeStore } from "../storage/so-bridge-store.js";
import { getBrowserOpenFailureMessage, openInBrowser } from "./browser.js";
import { runOpenCommand } from "./commands/open.js";
import { runPurgeCommand } from "./commands/purge.js";
import { runStartCommand } from "./commands/start.js";
import { runStatusCommand, type CliStatus } from "./commands/status.js";
import { runStopCommand } from "./commands/stop.js";

export interface CliDeps {
  print: (line: string) => void;
  statusProvider: () => Promise<CliStatus>;
  purge: () => Promise<void>;
  start?: () => Promise<void>;
  stop?: () => Promise<void>;
  isReachable?: () => Promise<boolean>;
  openUrl?: (url: string) => Promise<void>;
  url?: string;
  setExitCode?: (code: number) => void;
}

type CliCommandName = "start" | "status" | "open" | "stop" | "purge";

type CliCommandDefinition = {
  name: CliCommandName;
  summary: string;
  usage: string;
};

const CLI_COMMANDS: CliCommandDefinition[] = [
  {
    name: "start",
    summary: "Start the bridge service",
    usage: "so-bridge start",
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
  const url = "http://127.0.0.1:3000/admin";

  return {
    print: console.log,
    statusProvider: async () => readStatusFromLocalStore(paths),
    purge: async () => {
      await rm(paths.configDir, { recursive: true, force: true });
      await rm(paths.dataDir, { recursive: true, force: true });
      await rm(paths.logDir, { recursive: true, force: true });
    },
    isReachable: async () => {
      try {
        const response = await fetch("http://127.0.0.1:3000/health");
        return response.ok;
      } catch {
        return false;
      }
    },
    openUrl: openInBrowser,
    url,
    setExitCode: (code: number) => {
      process.exitCode = code;
    },
    start: async () => {
      const { startSoBridgeServer } = await import("../index.js");
      await startSoBridgeServer();
    },
  };
}

export async function runCli(argv: string[], deps: CliDeps): Promise<void> {
  const [command, subcommandOrFlag] = argv;

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

    if (command === "purge") {
      await runPurgeCommand(deps);
      return;
    }

    if (command === "start") {
      await runStartCommand(deps);
      return;
    }

    if (command === "stop") {
      await runStopCommand(deps);
      return;
    }

    if (command === "open") {
      await runOpenCommand({
        isReachable: deps.isReachable ?? (async () => false),
        openUrl: async (url) => {
          try {
            await (deps.openUrl ?? openInBrowser)(url);
          } catch {
            throw new Error(getBrowserOpenFailureMessage(url));
          }
        },
        url: deps.url ?? "http://127.0.0.1:3000/admin",
        print: deps.print,
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
}

export async function readStatusFromLocalStore(paths: SoBridgePaths = getSoBridgePaths()): Promise<CliStatus> {
  const store = new SoBridgeStore(paths);
  const snapshot = await store.readAll();
  const activeProfile =
    snapshot.state.activeBridgeProfileId === null
      ? null
      : snapshot.config.bridgeProfiles.find((profile) => profile.id === snapshot.state.activeBridgeProfileId) ?? null;

  return {
    activeBridgeProfileName: activeProfile?.name ?? null,
    directoryMode: snapshot.config.directoryPolicy.mode,
    selectedPath: snapshot.config.directoryPolicy.selectedPath,
    configFile: paths.configFile,
    stateFile: paths.stateFile,
  };
}

if (typeof require !== "undefined" && require.main === module) {
  void runCli(process.argv.slice(2), createDefaultCliDeps());
}
