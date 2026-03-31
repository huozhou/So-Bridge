import { createDefaultSoBridgeConfig } from "./default-so-bridge-config.js";
import type {
  AIAssistant,
  BotIntegration,
  BridgeProfile,
  DirectoryPolicyMode,
  SoBridgeConfig,
  SoBridgeValidationResult,
  ValidationIssue,
} from "./so-bridge-config.js";

const KNOWN_BOT_PLATFORMS = new Set(["slack", "lark"]);
const KNOWN_AI_PROVIDERS = new Set([
  "codex-cli",
  "claude-code",
  "cursor",
  "vscode-agent",
  "cloud-sandbox",
]);
const KNOWN_DIRECTORY_POLICY_MODES = new Set(["open", "restricted"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  fallback: string,
  issues: ValidationIssue[],
  path: string,
  message = `${path} must be a string`,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (value !== undefined) {
    issues.push({ path, message });
  }

  return fallback;
}

function readStringArray(
  value: unknown,
  fallback: string[],
  issues: ValidationIssue[],
  path: string,
): string[] {
  if (Array.isArray(value)) {
    const invalidIndex = value.findIndex((entry) => typeof entry !== "string");
    if (invalidIndex === -1) {
      return [...value];
    }

    issues.push({
      path: `${path}[${invalidIndex}]`,
      message: `${path} entries must be strings`,
    });
    return [...fallback];
  }

  if (value !== undefined) {
    issues.push({ path, message: `${path} must be an array of strings` });
  }

  return [...fallback];
}

function readNullableString(
  value: unknown,
  fallback: string | null,
  issues: ValidationIssue[],
  path: string,
): string | null {
  if (typeof value === "string" || value === null) {
    return value;
  }

  if (value !== undefined) {
    issues.push({ path, message: `${path} must be a string or null` });
  }

  return fallback;
}

function normalizeConfigMap(
  value: unknown,
  issues: ValidationIssue[],
  path: string,
): Record<string, string | boolean> {
  if (!isRecord(value)) {
    if (value !== undefined) {
      issues.push({ path, message: `${path} must be an object` });
    }
    return {};
  }

  const result: Record<string, string | boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "boolean") {
      result[key] = entry;
      continue;
    }

    issues.push({
      path: `${path}.${key}`,
      message: `${path}.${key} must be a string or boolean`,
    });
  }

  return result;
}

function normalizeBotIntegrations(
  value: unknown,
  issues: ValidationIssue[],
): BotIntegration[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({ path: "botIntegrations", message: "botIntegrations must be an array" });
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({
        path: `botIntegrations[${index}]`,
        message: "Bot integration must be an object",
      });
      return [];
    }

    const platform = readString(
      entry.platform,
      "slack",
      issues,
      `botIntegrations[${index}].platform`,
    );

    if (!KNOWN_BOT_PLATFORMS.has(platform)) {
      issues.push({
        path: `botIntegrations[${index}].platform`,
        message: "Bot integration platform must be one of: slack, lark",
      });
    }

    return [
      {
        id: readString(entry.id, "", issues, `botIntegrations[${index}].id`),
        name: readString(entry.name, "", issues, `botIntegrations[${index}].name`),
        platform: (KNOWN_BOT_PLATFORMS.has(platform) ? platform : "slack") as BotIntegration["platform"],
        config: normalizeConfigMap(entry.config, issues, `botIntegrations[${index}].config`),
      },
    ];
  });
}

function normalizeAIAssistants(
  value: unknown,
  issues: ValidationIssue[],
): AIAssistant[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({ path: "aiAssistants", message: "aiAssistants must be an array" });
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({
        path: `aiAssistants[${index}]`,
        message: "AI assistant must be an object",
      });
      return [];
    }

    const provider = readString(
      entry.provider,
      "codex-cli",
      issues,
      `aiAssistants[${index}].provider`,
    );

    if (!KNOWN_AI_PROVIDERS.has(provider)) {
      issues.push({
        path: `aiAssistants[${index}].provider`,
        message:
          "AI assistant provider must be one of: codex-cli, claude-code, cursor, vscode-agent, cloud-sandbox",
      });
    }

    return [
      {
        id: readString(entry.id, "", issues, `aiAssistants[${index}].id`),
        name: readString(entry.name, "", issues, `aiAssistants[${index}].name`),
        provider: (KNOWN_AI_PROVIDERS.has(provider)
          ? provider
          : "codex-cli") as AIAssistant["provider"],
        config: normalizeConfigMap(entry.config, issues, `aiAssistants[${index}].config`),
      },
    ];
  });
}

function normalizeBridgeProfiles(
  value: unknown,
  issues: ValidationIssue[],
): BridgeProfile[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({ path: "bridgeProfiles", message: "bridgeProfiles must be an array" });
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({
        path: `bridgeProfiles[${index}]`,
        message: "Bridge profile must be an object",
      });
      return [];
    }

    return [
      {
        id: readString(entry.id, "", issues, `bridgeProfiles[${index}].id`),
        name: readString(entry.name, "", issues, `bridgeProfiles[${index}].name`),
        botIntegrationId: readString(
          entry.botIntegrationId,
          "",
          issues,
          `bridgeProfiles[${index}].botIntegrationId`,
        ),
        aiAssistantId: readString(
          entry.aiAssistantId,
          "",
          issues,
          `bridgeProfiles[${index}].aiAssistantId`,
        ),
      },
    ];
  });
}

function normalizeDirectoryPolicy(
  value: unknown,
  issues: ValidationIssue[],
  defaults: SoBridgeConfig,
): SoBridgeConfig["directoryPolicy"] {
  const source = isRecord(value) ? value : {};
  const mode = readString(
    source.mode,
    defaults.directoryPolicy.mode,
    issues,
    "directoryPolicy.mode",
  );

  if (!KNOWN_DIRECTORY_POLICY_MODES.has(mode)) {
    issues.push({
      path: "directoryPolicy.mode",
      message: "Directory policy mode must be open or restricted",
    });
  }

  const allowedPaths = readStringArray(
    source.allowedPaths,
    defaults.directoryPolicy.allowedPaths,
    issues,
    "directoryPolicy.allowedPaths",
  );
  const selectedPath = readNullableString(
    source.selectedPath,
    defaults.directoryPolicy.selectedPath,
    issues,
    "directoryPolicy.selectedPath",
  );
  const normalizedMode = (KNOWN_DIRECTORY_POLICY_MODES.has(mode)
    ? mode
    : defaults.directoryPolicy.mode) as DirectoryPolicyMode;

  if (normalizedMode === "restricted" && (!selectedPath || !allowedPaths.includes(selectedPath))) {
    issues.push({
      path: "directoryPolicy.selectedPath",
      message: "Restricted mode requires a selected whitelist path",
    });
  }

  return {
    mode: normalizedMode,
    allowedPaths,
    selectedPath,
  };
}

function validateReferences(config: SoBridgeConfig, issues: ValidationIssue[]): void {
  const botIds = new Set(config.botIntegrations.map((item) => item.id));
  const aiIds = new Set(config.aiAssistants.map((item) => item.id));

  config.bridgeProfiles.forEach((profile, index) => {
    if (!botIds.has(profile.botIntegrationId)) {
      issues.push({
        path: `bridgeProfiles[${index}].botIntegrationId`,
        message: "Bridge profile must reference an existing Bot integration",
      });
    }

    if (!aiIds.has(profile.aiAssistantId)) {
      issues.push({
        path: `bridgeProfiles[${index}].aiAssistantId`,
        message: "Bridge profile must reference an existing AI assistant",
      });
    }
  });
}

export function validateSoBridgeConfig(input: unknown): SoBridgeValidationResult {
  const defaults = createDefaultSoBridgeConfig();
  const issues: ValidationIssue[] = [];
  const source = isRecord(input) ? input : {};

  const config: SoBridgeConfig = {
    botIntegrations: normalizeBotIntegrations(source.botIntegrations, issues),
    aiAssistants: normalizeAIAssistants(source.aiAssistants, issues),
    bridgeProfiles: normalizeBridgeProfiles(source.bridgeProfiles, issues),
    directoryPolicy: normalizeDirectoryPolicy(source.directoryPolicy, issues, defaults),
  };

  validateReferences(config, issues);

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    config,
    issues: [],
  };
}
