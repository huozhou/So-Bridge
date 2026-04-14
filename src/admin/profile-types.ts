import type { DirectoryPolicyMode, SoBridgeConfig } from "../models/so-bridge-config.js";

export interface SavedServerDto {
  host: string;
  port: number;
}

export interface RuntimeServerDto {
  host: string;
  port: number;
  startedAt: string;
}

export interface CurrentBridgeDto {
  activeBridgeProfileId: string | null;
  botConnectionLabel: string | null;
  aiAssistantLabel: string | null;
  bridgeState: "Enabled" | "Incomplete" | "Invalid Configuration";
  directoryMode: DirectoryPolicyMode;
  selectedPath: string | null;
  savedServer: SavedServerDto;
  runtimeServer: RuntimeServerDto | null;
}

export interface AdminResourcesDto {
  botIntegrations: SoBridgeConfig["botIntegrations"];
  aiAssistants: SoBridgeConfig["aiAssistants"];
  bridgeProfiles: SoBridgeConfig["bridgeProfiles"];
  directoryPolicy: SoBridgeConfig["directoryPolicy"];
  server: SoBridgeConfig["server"];
}

export type BotIntegrationInput = Omit<SoBridgeConfig["botIntegrations"][number], "id">;
export type AIAssistantInput = Omit<SoBridgeConfig["aiAssistants"][number], "id">;
