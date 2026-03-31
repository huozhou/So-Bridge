#!/usr/bin/env node

import { rm } from "node:fs/promises";

import { getSoBridgePaths } from "../app-paths.js";
import { openInBrowser } from "./browser.js";
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
}

function createDefaultCliDeps(): CliDeps {
  const paths = getSoBridgePaths();
  const url = "http://127.0.0.1:3000/admin";

  return {
    print: (line: string) => {
      console.log(line);
    },
    statusProvider: async () => ({
      activeBridgeProfileName: null,
      directoryMode: "open",
      selectedPath: null,
      configFile: paths.configFile,
      stateFile: paths.stateFile,
    }),
    purge: async () => {
      const paths = getSoBridgePaths();
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
    start: async () => {
      const { startSoBridgeServer } = await import("../index.js");
      await startSoBridgeServer();
    },
  };
}

export async function runCli(argv: string[], deps: CliDeps): Promise<void> {
  const [command] = argv;

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
      openUrl: deps.openUrl ?? openInBrowser,
      url: deps.url ?? "http://127.0.0.1:3000/admin",
      print: deps.print,
    });
    return;
  }

  deps.print("Usage: so-bridge <start|stop|status|open|purge>");
}

if (typeof require !== "undefined" && require.main === module) {
  void runCli(process.argv.slice(2), createDefaultCliDeps());
}
