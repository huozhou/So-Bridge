import type { BridgeConfigFile } from "./types.js";

const DEFAULT_CONFIG: BridgeConfigFile = {
  server: { host: "127.0.0.1", port: 3000 },
  platforms: {
    mode: "websocket",
    slack: { enabled: false, botToken: "", appToken: "", signingSecret: "" },
    lark: { enabled: false, appId: "", appSecret: "" },
  },
  agents: {
    defaultBackend: "codex-cli",
    codexCli: { enabled: true, skipGitRepoCheck: true, workingDir: "" },
    claudeCode: { enabled: false },
    cursor: { enabled: false },
    vscodeAgent: { enabled: false, endpoint: "http://localhost:23119" },
    cloudSandbox: { enabled: false, apiUrl: "", apiKey: "" },
  },
  security: { authToken: "dev-token", webhookSecret: "" },
};

export function createDefaultBridgeConfig(): BridgeConfigFile {
  return structuredClone(DEFAULT_CONFIG);
}
