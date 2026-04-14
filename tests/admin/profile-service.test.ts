import { describe, expect, it, vi } from "vitest";

import {
  createDefaultSoBridgeConfig,
  createDefaultSoBridgeState,
} from "../../src/models/default-so-bridge-config.js";
import { ProfileAdminService } from "../../src/admin/profile-service.js";

describe("ProfileAdminService", () => {
  it("returns current bridge summary with selected Bot Connection, AI Assistant, and target project", async () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4100;
    config.botIntegrations.push({
      id: "bot_1",
      name: "ignored-name",
      platform: "lark",
      config: { appId: "app-id", appSecret: "app-secret" },
    });
    config.aiAssistants.push({
      id: "ai_1",
      name: "ignored-name",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    });
    config.bridgeProfiles.push({
      id: "profile_1",
      name: "hidden-profile",
      botIntegrationId: "bot_1",
      aiAssistantId: "ai_1",
    });
    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a"];
    config.directoryPolicy.selectedPath = "/repo/a";
    const state = createDefaultSoBridgeState();
    state.activeBridgeProfileId = "profile_1";
    state.runtimeServer = {
      host: "127.0.0.1",
      port: 4200,
      startedAt: "2026-04-14T08:00:00.000Z",
    };

    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(service.getCurrentBridge()).resolves.toEqual({
      activeBridgeProfileId: "profile_1",
      botConnectionLabel: "Lark (Feishu)",
      aiAssistantLabel: "Codex CLI",
      bridgeState: "Enabled",
      directoryMode: "restricted",
      selectedPath: "/repo/a",
      savedServer: {
        host: "127.0.0.1",
        port: 4100,
      },
      runtimeServer: {
        host: "127.0.0.1",
        port: 4200,
        startedAt: "2026-04-14T08:00:00.000Z",
      },
    });
  });

  it("returns saved server details and null runtime server when not running", async () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4300;
    const state = createDefaultSoBridgeState();
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(service.getCurrentBridge()).resolves.toEqual({
      activeBridgeProfileId: null,
      botConnectionLabel: null,
      aiAssistantLabel: null,
      bridgeState: "Incomplete",
      directoryMode: "open",
      selectedPath: null,
      savedServer: {
        host: "127.0.0.1",
        port: 4300,
      },
      runtimeServer: null,
    });
  });

  it("returns server settings in admin resources", async () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4400;
    const state = createDefaultSoBridgeState();
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(service.getResources()).resolves.toEqual(
      expect.objectContaining({
        server: {
          port: 4400,
        },
      }),
    );
  });

  it("creates a Bot integration", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.createBotIntegration({
      name: "Slack Main Bot",
      platform: "slack",
      config: { botToken: "xoxb", appToken: "xapp" },
    });

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        botIntegrations: [expect.objectContaining({ name: "Slack Main Bot" })],
      }),
      state,
    );
  });

  it("rejects creating a Slack Bot integration without both required tokens", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(
      service.createBotIntegration({
        name: "Slack",
        platform: "slack",
        config: { botToken: "xoxb" },
      }),
    ).rejects.toThrow("App Token is required for Slack socket mode");
  });

  it("updates an existing Bot integration", async () => {
    const config = createDefaultSoBridgeConfig();
    config.botIntegrations.push({
      id: "bot_1",
      name: "Slack",
      platform: "slack",
      config: { botToken: "old", appToken: "old-app" },
    });
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.updateBotIntegration("bot_1", {
      name: "Slack",
      platform: "slack",
      config: { botToken: "new", appToken: "new-app" },
    });

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        botIntegrations: [expect.objectContaining({ id: "bot_1", config: { botToken: "new", appToken: "new-app" } })],
      }),
      state,
    );
  });

  it("deletes a Bot integration", async () => {
    const config = createDefaultSoBridgeConfig();
    config.botIntegrations.push({
      id: "bot_1",
      name: "Slack",
      platform: "slack",
      config: { botToken: "xoxb", appToken: "xapp" },
    });
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.deleteBotIntegration("bot_1");

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        botIntegrations: [],
      }),
      state,
    );
  });

  it("creates an AI assistant", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.createAIAssistant({
      name: "Codex",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    });

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        aiAssistants: [expect.objectContaining({ name: "Codex" })],
      }),
      state,
    );
  });

  it("rejects creating an AI assistant without a provider", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(
      service.createAIAssistant({
        name: "Codex CLI",
        provider: "" as "codex-cli",
        config: {},
      }),
    ).rejects.toThrow("AI assistant provider is required");
  });

  it("updates an existing AI assistant", async () => {
    const config = createDefaultSoBridgeConfig();
    config.aiAssistants.push({
      id: "ai_1",
      name: "VSCode Agent",
      provider: "vscode-agent",
      config: { endpoint: "http://localhost:3001" },
    });
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.updateAIAssistant("ai_1", {
      name: "VSCode Agent",
      provider: "vscode-agent",
      config: { endpoint: "http://localhost:4000" },
    });

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        aiAssistants: [expect.objectContaining({ id: "ai_1", config: { endpoint: "http://localhost:4000" } })],
      }),
      state,
    );
  });

  it("deletes an AI assistant", async () => {
    const config = createDefaultSoBridgeConfig();
    config.aiAssistants.push({
      id: "ai_1",
      name: "Codex CLI",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    });
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await service.deleteAIAssistant("ai_1");

    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        aiAssistants: [],
      }),
      state,
    );
  });

  it("creates a bridge profile from a Bot integration and AI assistant", async () => {
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
    const state = createDefaultSoBridgeState();
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: save,
      activateProfile: vi.fn(),
    });

    await service.createBridgeProfile({
      name: "Slack -> Codex",
      botIntegrationId: "bot_1",
      aiAssistantId: "ai_1",
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        bridgeProfiles: [
          expect.objectContaining({
            name: "Slack -> Codex",
            botIntegrationId: "bot_1",
            aiAssistantId: "ai_1",
          }),
        ],
      }),
      state,
    );
  });

  it("rejects activating a bridge profile whose Bot integration is incomplete", async () => {
    const config = createDefaultSoBridgeConfig();
    config.botIntegrations.push({
      id: "bot_1",
      name: "Slack Main Bot",
      platform: "slack",
      config: { botToken: "xoxb" },
    });
    config.aiAssistants.push({
      id: "ai_1",
      name: "Codex",
      provider: "codex-cli",
      config: {},
    });
    config.bridgeProfiles.push({
      id: "profile_1",
      name: "Slack -> Codex",
      botIntegrationId: "bot_1",
      aiAssistantId: "ai_1",
    });

    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({
        config,
        state: createDefaultSoBridgeState(),
      }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(service.activateBridgeProfile("profile_1")).rejects.toThrow("missing appToken");
  });

  it("updates saved server settings", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const saveSnapshot = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot,
      activateProfile: vi.fn(),
    });

    await expect(service.updateServerSettings({ port: 4500 })).resolves.toEqual({ port: 4500 });
    expect(saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        server: {
          port: 4500,
        },
      }),
      state,
    );
  });

  it("rejects invalid saved server ports", async () => {
    const config = createDefaultSoBridgeConfig();
    const state = createDefaultSoBridgeState();
    const service = new ProfileAdminService({
      loadSnapshot: vi.fn().mockResolvedValue({ config, state }),
      saveSnapshot: vi.fn(),
      activateProfile: vi.fn(),
    });

    await expect(service.updateServerSettings({ port: 0 })).rejects.toThrow(
      "Server port must be an integer between 1 and 65535",
    );
    await expect(service.updateServerSettings({ port: 65536 })).rejects.toThrow(
      "Server port must be an integer between 1 and 65535",
    );
    await expect(service.updateServerSettings({ port: 12.5 })).rejects.toThrow(
      "Server port must be an integer between 1 and 65535",
    );
  });
});
