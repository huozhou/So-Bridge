import { randomUUID } from "node:crypto";

import type { SoBridgeConfig, SoBridgeState } from "../models/so-bridge-config.js";
import type {
  AIAssistantInput,
  AdminResourcesDto,
  BotIntegrationInput,
  CurrentBridgeDto,
} from "./profile-types.js";

export class ProfileAdminService {
  constructor(
    private readonly deps: {
      loadSnapshot: () => Promise<{ config: SoBridgeConfig; state: SoBridgeState }>;
      saveSnapshot: (config: SoBridgeConfig, state: SoBridgeState) => Promise<void>;
      activateProfile: (profileId: string | null) => Promise<void>;
    },
  ) {}

  async getCurrentBridge(): Promise<CurrentBridgeDto> {
    const { config, state } = await this.deps.loadSnapshot();
    const activeProfile =
      state.activeBridgeProfileId === null
        ? null
        : config.bridgeProfiles.find((profile) => profile.id === state.activeBridgeProfileId) ?? null;
    const bot = activeProfile
      ? config.botIntegrations.find((item) => item.id === activeProfile.botIntegrationId) ?? null
      : null;
    const ai = activeProfile
      ? config.aiAssistants.find((item) => item.id === activeProfile.aiAssistantId) ?? null
      : null;

    return {
      activeBridgeProfileId: activeProfile?.id ?? null,
      botConnectionLabel: bot ? formatBotLabel(bot.platform) : null,
      aiAssistantLabel: ai ? formatAssistantLabel(ai.provider) : null,
      bridgeState: bot && ai ? "Enabled" : "Incomplete",
      directoryMode: config.directoryPolicy.mode,
      selectedPath: config.directoryPolicy.selectedPath,
    };
  }

  async getResources(): Promise<AdminResourcesDto> {
    const { config } = await this.deps.loadSnapshot();

    return {
      botIntegrations: config.botIntegrations,
      aiAssistants: config.aiAssistants,
      bridgeProfiles: config.bridgeProfiles,
      directoryPolicy: config.directoryPolicy,
    };
  }

  async createBotIntegration(input: BotIntegrationInput) {
    validateBotIntegrationInput(input);
    const { config, state } = await this.deps.loadSnapshot();
    const created = {
      id: randomUUID(),
      ...input,
    };
    const nextConfig: SoBridgeConfig = {
      ...config,
      botIntegrations: [...config.botIntegrations, created],
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return created;
  }

  async updateBotIntegration(id: string | null, input: BotIntegrationInput) {
    if (!id) {
      throw new Error("Bot integration id is required");
    }

    validateBotIntegrationInput(input);
    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      botIntegrations: config.botIntegrations.map((item) => (item.id === id ? { id, ...input } : item)),
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return nextConfig.botIntegrations.find((item) => item.id === id) ?? null;
  }

  async deleteBotIntegration(id: string | null) {
    if (!id) {
      throw new Error("Bot integration id is required");
    }

    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      botIntegrations: config.botIntegrations.filter((item) => item.id !== id),
      bridgeProfiles: config.bridgeProfiles.filter((item) => item.botIntegrationId !== id),
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return { ok: true };
  }

  async createAIAssistant(input: AIAssistantInput) {
    validateAIAssistantInput(input);
    const { config, state } = await this.deps.loadSnapshot();
    const created = {
      id: randomUUID(),
      ...input,
    };
    const nextConfig: SoBridgeConfig = {
      ...config,
      aiAssistants: [...config.aiAssistants, created],
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return created;
  }

  async updateAIAssistant(id: string | null, input: AIAssistantInput) {
    if (!id) {
      throw new Error("AI assistant id is required");
    }

    validateAIAssistantInput(input);
    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      aiAssistants: config.aiAssistants.map((item) => (item.id === id ? { id, ...input } : item)),
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return nextConfig.aiAssistants.find((item) => item.id === id) ?? null;
  }

  async deleteAIAssistant(id: string | null) {
    if (!id) {
      throw new Error("AI assistant id is required");
    }

    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      aiAssistants: config.aiAssistants.filter((item) => item.id !== id),
      bridgeProfiles: config.bridgeProfiles.filter((item) => item.aiAssistantId !== id),
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return { ok: true };
  }

  async createBridgeProfile(input: {
    name: string;
    botIntegrationId: string;
    aiAssistantId: string;
  }) {
    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      bridgeProfiles: [
        ...config.bridgeProfiles,
        {
          id: randomUUID(),
          name: input.name,
          botIntegrationId: input.botIntegrationId,
          aiAssistantId: input.aiAssistantId,
        },
      ],
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return nextConfig.bridgeProfiles;
  }

  async activateBridgeProfile(profileId: string | null): Promise<CurrentBridgeDto> {
    const { config } = await this.deps.loadSnapshot();
    validateProfileActivation(config, profileId);
    await this.deps.activateProfile(profileId);
    return this.getCurrentBridge();
  }

  async updateDirectoryPolicy(input: SoBridgeConfig["directoryPolicy"]): Promise<SoBridgeConfig["directoryPolicy"]> {
    const { config, state } = await this.deps.loadSnapshot();
    const nextConfig: SoBridgeConfig = {
      ...config,
      directoryPolicy: {
        mode: input.mode,
        allowedPaths: [...input.allowedPaths],
        selectedPath: input.selectedPath,
      },
    };

    await this.deps.saveSnapshot(nextConfig, state);
    return nextConfig.directoryPolicy;
  }
}

function validateBotIntegrationInput(input: BotIntegrationInput): void {
  if (!input.name.trim()) {
    throw new Error("Bot integration name is required");
  }
  if (input.platform !== "slack" && input.platform !== "lark") {
    throw new Error("Bot integration platform must be slack or lark");
  }
  if (input.platform === "slack") {
    if (typeof input.config.botToken !== "string" || !input.config.botToken.trim()) {
      throw new Error("Bot Token is required.");
    }
    if (typeof input.config.appToken !== "string" || !input.config.appToken.trim()) {
      throw new Error("App Token is required for Slack socket mode");
    }
  }
  if (input.platform === "lark") {
    if (typeof input.config.appId !== "string" || !input.config.appId.trim()) {
      throw new Error("App ID is required.");
    }
    if (typeof input.config.appSecret !== "string" || !input.config.appSecret.trim()) {
      throw new Error("App Secret is required.");
    }
  }
}

function validateAIAssistantInput(input: AIAssistantInput): void {
  if (!input.name.trim()) {
    throw new Error("AI assistant name is required");
  }
  if (!input.provider) {
    throw new Error("AI assistant provider is required");
  }
}

function validateProfileActivation(config: SoBridgeConfig, profileId: string | null): void {
  if (profileId === null) {
    return;
  }

  const profile = config.bridgeProfiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error("Bridge profile does not exist");
  }

  const bot = config.botIntegrations.find((item) => item.id === profile.botIntegrationId);
  if (!bot) {
    throw new Error("Bridge profile references a missing Bot integration");
  }

  if (bot.platform === "slack") {
    if (typeof bot.config.appToken !== "string") {
      throw new Error(
        `Bridge profile cannot be activated because Bot Connection "${bot.name}" is missing appToken`,
      );
    }
  }

  if (bot.platform === "lark") {
    if (typeof bot.config.appId !== "string" || typeof bot.config.appSecret !== "string") {
      throw new Error(
        `Bridge profile cannot be activated because Bot Connection "${bot.name}" is incomplete`,
      );
    }
  }

  const ai = config.aiAssistants.find((item) => item.id === profile.aiAssistantId);
  if (!ai) {
    throw new Error("Bridge profile references a missing AI assistant");
  }
}

function formatBotLabel(platform: SoBridgeConfig["botIntegrations"][number]["platform"]): string {
  return platform === "lark" ? "Lark (Feishu)" : "Slack";
}

function formatAssistantLabel(
  provider: SoBridgeConfig["aiAssistants"][number]["provider"],
): string {
  switch (provider) {
    case "codex-cli":
      return "Codex CLI";
    case "claude-code":
      return "Claude Code";
    case "cursor":
      return "Cursor";
    case "vscode-agent":
      return "VSCode Agent";
    case "cloud-sandbox":
      return "Cloud Sandbox";
  }
}
