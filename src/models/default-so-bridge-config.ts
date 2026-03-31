import type { SoBridgeConfig, SoBridgeState } from "./so-bridge-config.js";

const DEFAULT_SO_BRIDGE_CONFIG: SoBridgeConfig = {
  botIntegrations: [],
  aiAssistants: [],
  bridgeProfiles: [],
  directoryPolicy: {
    mode: "open",
    allowedPaths: [],
    selectedPath: null,
  },
};

const DEFAULT_SO_BRIDGE_STATE: SoBridgeState = {
  activeBridgeProfileId: null,
  lastAppliedAt: null,
  lastError: null,
};

export function createDefaultSoBridgeConfig(): SoBridgeConfig {
  return structuredClone(DEFAULT_SO_BRIDGE_CONFIG);
}

export function createDefaultSoBridgeState(): SoBridgeState {
  return structuredClone(DEFAULT_SO_BRIDGE_STATE);
}
