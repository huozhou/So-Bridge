export type BotPlatform = "slack" | "lark";
export type AIAssistantProvider =
  | "codex-cli"
  | "claude-code"
  | "cursor"
  | "vscode-agent"
  | "cloud-sandbox";
export type DirectoryPolicyMode = "open" | "restricted";

export interface BotIntegration {
  id: string;
  name: string;
  platform: BotPlatform;
  config: Record<string, string | boolean>;
}

export interface AIAssistant {
  id: string;
  name: string;
  provider: AIAssistantProvider;
  config: Record<string, string | boolean>;
}

export interface BridgeProfile {
  id: string;
  name: string;
  botIntegrationId: string;
  aiAssistantId: string;
}

export interface DirectoryPolicy {
  mode: DirectoryPolicyMode;
  allowedPaths: string[];
  selectedPath: string | null;
}

export interface SoBridgeConfig {
  botIntegrations: BotIntegration[];
  aiAssistants: AIAssistant[];
  bridgeProfiles: BridgeProfile[];
  directoryPolicy: DirectoryPolicy;
}

export interface SoBridgeState {
  activeBridgeProfileId: string | null;
  lastAppliedAt: string | null;
  lastError: string | null;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type SoBridgeValidationResult =
  | { ok: true; config: SoBridgeConfig; issues: [] }
  | { ok: false; issues: ValidationIssue[] };
