import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SoBridgePaths } from "../../src/app-paths.js";
import {
  createDefaultSoBridgeConfig,
  createDefaultSoBridgeState,
} from "../../src/models/default-so-bridge-config.js";
import { SoBridgeStore } from "../../src/storage/so-bridge-store.js";

function createPaths(root: string): SoBridgePaths {
  return {
    configDir: join(root, "config"),
    dataDir: join(root, "data"),
    logDir: join(root, "logs"),
    configFile: join(root, "config", "config.json"),
    stateFile: join(root, "data", "state.json"),
  };
}

describe("SoBridgeStore", () => {
  it("creates default config and state files when missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "so-bridge-store-"));
    const store = new SoBridgeStore(createPaths(root));

    const result = await store.readAll();

    expect(result.createdDefaultConfig).toBe(true);
    expect(result.createdDefaultState).toBe(true);
    expect(existsSync(store.getPaths().configFile)).toBe(true);
    expect(existsSync(store.getPaths().stateFile)).toBe(true);
    expect(result.config).toEqual(createDefaultSoBridgeConfig());
    expect(result.state).toEqual(createDefaultSoBridgeState());
  });

  it("writes normalized config and state content atomically", async () => {
    const root = mkdtempSync(join(tmpdir(), "so-bridge-store-"));
    const store = new SoBridgeStore(createPaths(root));
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();

    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a", "/repo/b"];
    config.directoryPolicy.selectedPath = "/repo/a";
    state.activeBridgeProfileId = "profile_1";
    state.lastAppliedAt = "2026-03-26T00:00:00.000Z";

    await store.writeConfig(config);
    await store.writeState(state);

    const writtenConfig = JSON.parse(readFileSync(store.getPaths().configFile, "utf8"));
    const writtenState = JSON.parse(readFileSync(store.getPaths().stateFile, "utf8"));
    const reloaded = await store.readAll();

    expect(writtenConfig).toEqual(config);
    expect(writtenState).toEqual(state);
    expect(reloaded.config).toEqual(config);
    expect(reloaded.state).toEqual(state);
  });

  it("normalizes legacy config and state files missing new fields", async () => {
    const root = mkdtempSync(join(tmpdir(), "so-bridge-store-"));
    const paths = createPaths(root);
    const store = new SoBridgeStore(paths);
    mkdirSync(paths.configDir, { recursive: true });
    mkdirSync(paths.dataDir, { recursive: true });

    writeFileSync(
      paths.configFile,
      JSON.stringify({
        botIntegrations: [],
        aiAssistants: [],
        bridgeProfiles: [],
        directoryPolicy: {
          mode: "open",
          allowedPaths: [],
          selectedPath: null,
        },
      }),
      "utf8",
    );
    writeFileSync(
      paths.stateFile,
      JSON.stringify({
        activeBridgeProfileId: null,
        lastAppliedAt: null,
        lastError: null,
      }),
      "utf8",
    );

    const result = await store.readAll();

    expect(result.createdDefaultConfig).toBe(false);
    expect(result.createdDefaultState).toBe(false);
    expect(result.config.server.port).toBe(3000);
    expect(result.state.runtimeServer).toBeNull();
  });

  it("round-trips a valid runtimeServer state", async () => {
    const root = mkdtempSync(join(tmpdir(), "so-bridge-store-"));
    const store = new SoBridgeStore(createPaths(root));
    const state = createDefaultSoBridgeState();

    state.runtimeServer = {
      host: "127.0.0.1",
      port: 3000,
      startedAt: "2026-04-14T00:00:00.000Z",
    };

    await store.writeState(state);
    const result = await store.readState();

    expect(result.createdDefault).toBe(false);
    expect(result.state.runtimeServer).toEqual(state.runtimeServer);
  });
});
