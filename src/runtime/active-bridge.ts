import type {
  AIAssistant,
  BotIntegration,
  BridgeProfile,
  DirectoryPolicy,
  SoBridgeConfig,
} from "../models/so-bridge-config.js";

export interface ActiveBridgeDefinition {
  bridgeProfile: BridgeProfile | null;
  botIntegration: BotIntegration | null;
  aiAssistant: AIAssistant | null;
  directoryPolicy: DirectoryPolicy;
}

export function resolveActiveBridge(
  config: SoBridgeConfig,
  activeBridgeProfileId: string | null,
): ActiveBridgeDefinition {
  const bridgeProfile =
    activeBridgeProfileId === null
      ? null
      : config.bridgeProfiles.find((profile) => profile.id === activeBridgeProfileId) ?? null;

  return {
    bridgeProfile,
    botIntegration: bridgeProfile
      ? config.botIntegrations.find((item) => item.id === bridgeProfile.botIntegrationId) ?? null
      : null,
    aiAssistant: bridgeProfile
      ? config.aiAssistants.find((item) => item.id === bridgeProfile.aiAssistantId) ?? null
      : null,
    directoryPolicy: config.directoryPolicy,
  };
}
