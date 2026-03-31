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
