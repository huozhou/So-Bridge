import { describe, expect, it } from "vitest";

import { getSoBridgePaths } from "../src/app-paths.js";

describe("getSoBridgePaths", () => {
  it("resolves the so-bridge app-data paths for macOS", () => {
    expect(
      getSoBridgePaths({
        platform: "darwin",
        homeDir: "/Users/mock",
        env: {},
      }),
    ).toEqual({
      configDir: "/Users/mock/Library/Application Support/so-bridge",
      dataDir: "/Users/mock/Library/Application Support/so-bridge",
      logDir: "/Users/mock/Library/Logs/so-bridge",
      configFile: "/Users/mock/Library/Application Support/so-bridge/config.json",
      stateFile: "/Users/mock/Library/Application Support/so-bridge/state.json",
    });
  });
});
