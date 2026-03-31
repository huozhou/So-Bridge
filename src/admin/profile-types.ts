import type { DirectoryPolicyMode, SoBridgeConfig } from "../models/so-bridge-config.js";

export interface CurrentBridgeDto {
  activeBridgeProfileId: string | null;
  botConnectionLabel: string | null;
  aiAssistantLabel: string | null;
  bridgeState: "Enabled" | "Incomplete" | "Invalid Configuration";
  directoryMode: DirectoryPolicyMode;
  selectedPath: string | null;
}

export interface AdminResourcesDto {
  botIntegrations: SoBridgeConfig["botIntegrations"];
  aiAssistants: SoBridgeConfig["aiAssistants"];
  bridgeProfiles: SoBridgeConfig["bridgeProfiles"];
  directoryPolicy: SoBridgeConfig["directoryPolicy"];
}

export type BotIntegrationInput = Omit<SoBridgeConfig["botIntegrations"][number], "id">;
export type AIAssistantInput = Omit<SoBridgeConfig["aiAssistants"][number], "id">;
