export interface BridgeConfigFile {
  server: { host: string; port: number };
  platforms: {
    mode: "websocket" | "webhook";
    slack: { enabled: boolean; botToken: string; appToken: string; signingSecret: string };
    lark: { enabled: boolean; appId: string; appSecret: string };
  };
  agents: {
    defaultBackend: string;
    codexCli: { enabled: boolean; skipGitRepoCheck: boolean; workingDir: string };
    claudeCode: { enabled: boolean };
    cursor: { enabled: boolean };
    vscodeAgent: { enabled: boolean; endpoint: string };
    cloudSandbox: { enabled: boolean; apiUrl: string; apiKey: string };
  };
  security: { authToken: string; webhookSecret: string };
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; config: BridgeConfigFile; issues: [] }
  | { ok: false; issues: ValidationIssue[] };
