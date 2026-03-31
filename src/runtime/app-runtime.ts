import { createDefaultBackends } from "../backends/index.js";
import { createBridgeService } from "../bridge-service/index.js";
import { createDefaultBridgeConfig } from "../config/default-config.js";
import type { BridgeConfigFile } from "../config/types.js";
import { IMBot } from "../im-bot.js";
import type { ActiveBridgeDefinition } from "./active-bridge.js";
import { createPlatformManager } from "../platforms/manager.js";

export interface AppRuntime {
  config: BridgeConfigFile;
  bridge: ReturnType<typeof createBridgeService>;
  bot: IMBot;
  platformManager: ReturnType<typeof createPlatformManager>;
  availableBackends: string[];
}

export async function buildAppRuntime(config: BridgeConfigFile): Promise<AppRuntime> {
  const registry = createDefaultBackends({
    codexEnabled: config.agents.codexCli.enabled,
    codexSkipGitRepoCheck: config.agents.codexCli.skipGitRepoCheck,
    claudeCodeEnabled: config.agents.claudeCode.enabled,
    cursorEnabled: config.agents.cursor.enabled,
    vscodeAgentEnabled: config.agents.vscodeAgent.enabled,
    vscodeEndpoint: config.agents.vscodeAgent.endpoint,
    sandboxEnabled: config.agents.cloudSandbox.enabled,
    sandboxApiUrl: config.agents.cloudSandbox.apiUrl,
    sandboxApiKey: config.agents.cloudSandbox.apiKey,
    workingDir: config.agents.codexCli.workingDir,
  });

  const platformManager = createPlatformManager(config);
  const bridge = createBridgeService({
    port: config.server.port,
    authToken: config.security.authToken,
    backends: registry.toMap(),
    defaultBackend: config.agents.defaultBackend,
  });
  const bot = new IMBot({
    pipeline: bridge,
    webhookSecret: config.security.webhookSecret || undefined,
  });

  return {
    config,
    bridge,
    bot,
    platformManager,
    availableBackends: await registry.getAvailable(),
  };
}

export async function buildActiveBridgeRuntime(active: ActiveBridgeDefinition): Promise<AppRuntime> {
  const config = createDefaultBridgeConfig();
  const selectedProjectPath =
    active.directoryPolicy.mode === "restricted" ? active.directoryPolicy.selectedPath : null;

  if (active.directoryPolicy.mode === "restricted" && !selectedProjectPath) {
    throw new Error("Restricted mode requires a selected whitelist path");
  }

  config.platforms.mode = "websocket";
  config.platforms.slack.enabled = false;
  config.platforms.lark.enabled = false;
  config.agents.codexCli.enabled = false;
  config.agents.claudeCode.enabled = false;
  config.agents.cursor.enabled = false;
  config.agents.vscodeAgent.enabled = false;
  config.agents.cloudSandbox.enabled = false;
  config.agents.codexCli.workingDir = selectedProjectPath ?? "";

  if (active.bridgeProfile && active.botIntegration) {
    if (active.botIntegration.platform === "slack") {
      config.platforms.slack.enabled = true;
      config.platforms.slack.botToken = readString(active.botIntegration.config.botToken);
      config.platforms.slack.appToken = readString(active.botIntegration.config.appToken);
      config.platforms.slack.signingSecret = readString(
        active.botIntegration.config.signingSecret,
      );
    }

    if (active.botIntegration.platform === "lark") {
      config.platforms.lark.enabled = true;
      config.platforms.lark.appId = readString(active.botIntegration.config.appId);
      config.platforms.lark.appSecret = readString(active.botIntegration.config.appSecret);
    }
  }

  if (active.bridgeProfile && active.aiAssistant) {
    config.agents.defaultBackend = active.aiAssistant.provider;

    switch (active.aiAssistant.provider) {
      case "codex-cli":
        config.agents.codexCli.enabled = true;
        config.agents.codexCli.skipGitRepoCheck = readBoolean(
          active.aiAssistant.config.skipGitRepoCheck,
          true,
        );
        break;
      case "claude-code":
        config.agents.claudeCode.enabled = true;
        break;
      case "cursor":
        config.agents.cursor.enabled = true;
        break;
      case "vscode-agent":
        config.agents.vscodeAgent.enabled = true;
        config.agents.vscodeAgent.endpoint = readString(
          active.aiAssistant.config.endpoint,
          config.agents.vscodeAgent.endpoint,
        );
        break;
      case "cloud-sandbox":
        config.agents.cloudSandbox.enabled = true;
        config.agents.cloudSandbox.apiUrl = readString(active.aiAssistant.config.apiUrl);
        config.agents.cloudSandbox.apiKey = readString(active.aiAssistant.config.apiKey);
        break;
    }
  }

  return buildAppRuntime(config);
}

function readString(value: string | boolean | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: string | boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
