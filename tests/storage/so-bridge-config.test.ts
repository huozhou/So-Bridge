import { describe, expect, it } from "vitest";

import { createDefaultSoBridgeConfig } from "../../src/models/default-so-bridge-config.js";
import { validateSoBridgeConfig } from "../../src/models/so-bridge-validator.js";

describe("validateSoBridgeConfig", () => {
  it("accepts the default so-bridge config", () => {
    const result = validateSoBridgeConfig(createDefaultSoBridgeConfig());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected validation to succeed");
    }

    expect(result.config.bridgeProfiles).toEqual([]);
    expect(result.config.directoryPolicy.mode).toBe("open");
    expect(result.config.server.port).toBe(3000);
  });

  it.each([0, 65536])("rejects invalid server port %s", (port) => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = port;

    const result = validateSoBridgeConfig(config);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }

    expect(result.issues).toContainEqual({
      path: "server.port",
      message: "server.port must be an integer between 1 and 65535",
    });
  });

  it.each([3000.5, "3000"])("rejects non-integer server port %s", (port) => {
    const result = validateSoBridgeConfig({
      ...createDefaultSoBridgeConfig(),
      server: {
        port,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }

    expect(result.issues).toContainEqual({
      path: "server.port",
      message: "server.port must be an integer between 1 and 65535",
    });
  });

  it.each([null, 123, []])("rejects non-object server container %s", (server) => {
    const result = validateSoBridgeConfig({
      ...createDefaultSoBridgeConfig(),
      server,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }

    expect(result.issues).toContainEqual({
      path: "server",
      message: "server must be an object",
    });
  });

  it("normalizes legacy configs missing server fields", () => {
    const result = validateSoBridgeConfig({
      botIntegrations: [],
      aiAssistants: [],
      bridgeProfiles: [],
      directoryPolicy: {
        mode: "open",
        allowedPaths: [],
        selectedPath: null,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected validation to succeed");
    }

    expect(result.config.server.port).toBe(3000);
  });

  it("rejects bridge profiles that reference unknown resources", () => {
    const config = createDefaultSoBridgeConfig();
    config.bridgeProfiles.push({
      id: "profile_1",
      name: "Slack -> Codex",
      botIntegrationId: "missing-bot",
      aiAssistantId: "missing-ai",
    });

    const result = validateSoBridgeConfig(config);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }

    expect(result.issues).toContainEqual({
      path: "bridgeProfiles[0].botIntegrationId",
      message: "Bridge profile must reference an existing Bot integration",
    });
    expect(result.issues).toContainEqual({
      path: "bridgeProfiles[0].aiAssistantId",
      message: "Bridge profile must reference an existing AI assistant",
    });
  });

  it("accepts multiple whitelist paths in restricted mode", () => {
    const config = createDefaultSoBridgeConfig();
    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a", "/repo/b"];
    config.directoryPolicy.selectedPath = "/repo/a";

    const result = validateSoBridgeConfig(config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected validation to succeed");
    }

    expect(result.config.directoryPolicy.allowedPaths).toEqual(["/repo/a", "/repo/b"]);
  });

  it("rejects restricted mode when selectedPath is missing", () => {
    const config = createDefaultSoBridgeConfig();
    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a"];
    config.directoryPolicy.selectedPath = null;

    const result = validateSoBridgeConfig(config);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }

    expect(result.issues).toContainEqual({
      path: "directoryPolicy.selectedPath",
      message: "Restricted mode requires a selected whitelist path",
    });
  });
});
