import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { SoBridgePaths } from "../app-paths.js";
import {
  createDefaultSoBridgeConfig,
  createDefaultSoBridgeState,
} from "../models/default-so-bridge-config.js";
import type { SoBridgeConfig, SoBridgeState } from "../models/so-bridge-config.js";
import { validateSoBridgeConfig } from "../models/so-bridge-validator.js";

export interface SoBridgeReadResult {
  config: SoBridgeConfig;
  state: SoBridgeState;
  createdDefaultConfig: boolean;
  createdDefaultState: boolean;
}

export class SoBridgeStore {
  constructor(private readonly paths: SoBridgePaths) {}

  async readAll(): Promise<SoBridgeReadResult> {
    const configResult = await this.readConfig();
    const stateResult = await this.readState();

    return {
      config: configResult.config,
      state: stateResult.state,
      createdDefaultConfig: configResult.createdDefault,
      createdDefaultState: stateResult.createdDefault,
    };
  }

  async readConfig(): Promise<{ config: SoBridgeConfig; createdDefault: boolean }> {
    try {
      const raw = await readFile(this.paths.configFile, "utf8");
      const parsed = JSON.parse(raw);
      const validated = validateSoBridgeConfig(parsed);
      if (!validated.ok) {
        throw new Error(validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
      }

      return {
        config: validated.config,
        createdDefault: false,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      const config = createDefaultSoBridgeConfig();
      await this.writeConfig(config);
      return {
        config,
        createdDefault: true,
      };
    }
  }

  async readState(): Promise<{ state: SoBridgeState; createdDefault: boolean }> {
    try {
      const raw = await readFile(this.paths.stateFile, "utf8");
      return {
        state: normalizeState(JSON.parse(raw)),
        createdDefault: false,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      const state = createDefaultSoBridgeState();
      await this.writeState(state);
      return {
        state,
        createdDefault: true,
      };
    }
  }

  async writeConfig(config: SoBridgeConfig): Promise<void> {
    const validated = validateSoBridgeConfig(config);
    if (!validated.ok) {
      throw new Error(validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    }

    await writeJsonFile(this.paths.configFile, validated.config);
  }

  async writeState(state: SoBridgeState): Promise<void> {
    await writeJsonFile(this.paths.stateFile, normalizeState(state));
  }

  getPaths(): SoBridgePaths {
    return this.paths;
  }
}

function normalizeState(input: unknown): SoBridgeState {
  const defaults = createDefaultSoBridgeState();
  const source =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const runtimeServer = normalizeRuntimeServer(source.runtimeServer);

  return {
    activeBridgeProfileId:
      typeof source.activeBridgeProfileId === "string" || source.activeBridgeProfileId === null
        ? source.activeBridgeProfileId
        : defaults.activeBridgeProfileId,
    lastAppliedAt:
      typeof source.lastAppliedAt === "string" || source.lastAppliedAt === null
        ? source.lastAppliedAt
        : defaults.lastAppliedAt,
    lastError:
      typeof source.lastError === "string" || source.lastError === null
        ? source.lastError
        : defaults.lastError,
    runtimeServer,
  };
}

function normalizeRuntimeServer(
  value: unknown,
): SoBridgeState["runtimeServer"] {
  if (!isRuntimeServerRecord(value)) {
    return null;
  }

  return {
    host: value.host,
    port: value.port,
    startedAt: value.startedAt,
  };
}

function isRuntimeServerRecord(
  value: unknown,
): value is {
  host: string;
  port: number;
  startedAt: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const source = value as Record<string, unknown>;
  return (
    typeof source.host === "string" &&
    Number.isInteger(source.port) &&
    source.port >= 1 &&
    source.port <= 65535 &&
    typeof source.startedAt === "string"
  );
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, path);
}
