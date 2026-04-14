import { describe, expect, it } from "vitest";

import {
  DEFAULT_SERVER_HOST,
  buildAdminUrl,
  buildBaseUrl,
  buildHealthUrl,
  clearRuntimeServer,
  resolveServerBinding,
  setRuntimeServer,
} from "../../src/server/server-binding.js";
import {
  createDefaultSoBridgeConfig,
  createDefaultSoBridgeState,
} from "../../src/models/default-so-bridge-config.js";

describe("server-binding", () => {
  it("prefers an explicit port override over the saved config port", () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4100;

    const binding = resolveServerBinding(config, { port: 4200 });

    expect(binding).toEqual({
      host: DEFAULT_SERVER_HOST,
      port: 4200,
    });
  });

  it("falls back to the saved config port when no override is provided", () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4300;

    const binding = resolveServerBinding(config, {});

    expect(binding).toEqual({
      host: DEFAULT_SERVER_HOST,
      port: 4300,
    });
  });

  it("builds base, admin, and health URLs from the binding", () => {
    const binding = {
      host: DEFAULT_SERVER_HOST,
      port: 4400,
    };

    expect(buildBaseUrl(binding)).toBe("http://127.0.0.1:4400");
    expect(buildAdminUrl(binding)).toBe("http://127.0.0.1:4400/admin");
    expect(buildHealthUrl(binding)).toBe("http://127.0.0.1:4400/health");
  });

  it("sets and clears runtime server state", () => {
    const state = createDefaultSoBridgeState();
    const startedAt = "2026-04-14T00:00:00.000Z";

    setRuntimeServer(state, DEFAULT_SERVER_HOST, 4500, startedAt);

    expect(state.runtimeServer).toEqual({
      host: DEFAULT_SERVER_HOST,
      port: 4500,
      startedAt,
    });

    clearRuntimeServer(state);

    expect(state.runtimeServer).toBeNull();
  });
});
