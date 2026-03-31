import { describe, expect, it, vi } from "vitest";

import {
  createDefaultSoBridgeConfig,
  createDefaultSoBridgeState,
} from "../../src/models/default-so-bridge-config.js";
import { ProfileRuntimeManager } from "../../src/runtime/profile-runtime-manager.js";

describe("ProfileRuntimeManager", () => {
  it("applies the active bridge profile", async () => {
    const config = createDefaultSoBridgeConfig();
    config.botIntegrations.push({
      id: "bot_1",
      name: "Slack Main Bot",
      platform: "slack",
      config: { botToken: "xoxb", appToken: "xapp" },
    });
    config.aiAssistants.push({
      id: "ai_1",
      name: "Codex",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    });
    config.bridgeProfiles.push({
      id: "profile_1",
      name: "Slack -> Codex",
      botIntegrationId: "bot_1",
      aiAssistantId: "ai_1",
    });
    const state = createDefaultSoBridgeState();
    state.activeBridgeProfileId = "profile_1";

    const buildRuntime = vi.fn().mockResolvedValue({ runtimeId: "runtime-1" });
    const manager = new ProfileRuntimeManager({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      buildRuntime,
      saveState: vi.fn(),
    });

    await manager.initialize();

    expect(buildRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        bridgeProfile: expect.objectContaining({ id: "profile_1" }),
        directoryPolicy: expect.objectContaining({ mode: "open" }),
      }),
    );
  });

  it("keeps the previous runtime if applying a new active profile fails", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const loadSnapshot = vi.fn().mockResolvedValue({ config, state });
    const buildRuntime = vi
      .fn()
      .mockResolvedValueOnce({ runtimeId: "runtime-old" })
      .mockRejectedValueOnce(new Error("apply failed"));
    const manager = new ProfileRuntimeManager({
      loadSnapshot,
      buildRuntime,
      saveState: vi.fn(),
    });

    await manager.initialize();
    await expect(manager.reload()).rejects.toThrow("apply failed");
    expect(manager.getRuntime()).toEqual({ runtimeId: "runtime-old" });
  });
});
