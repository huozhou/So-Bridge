import type { ExecutionBackend } from "../types.js";

import { ClaudeCodeBackend } from "./claude-code.js";
import { CloudSandboxBackend } from "./cloud-sandbox.js";
import { CodexCliBackend } from "./codex-cli.js";
import { CursorBackend } from "./cursor.js";
import { VSCodeAgentBackend } from "./vscode-agent.js";

export class BackendRegistry {
  private readonly backends = new Map<string, ExecutionBackend>();

  constructor(backends: ExecutionBackend[]) {
    for (const b of backends) {
      this.backends.set(b.name, b);
    }
  }

  get(name: string): ExecutionBackend | undefined {
    return this.backends.get(name);
  }

  async getAvailable(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, backend] of this.backends) {
      if (await backend.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }

  toMap(): Map<string, ExecutionBackend> {
    return new Map(this.backends);
  }
}

export function createDefaultBackends(config: {
  codexEnabled?: boolean;
  claudeCodeEnabled?: boolean;
  cursorEnabled?: boolean;
  vscodeAgentEnabled?: boolean;
  vscodeEndpoint?: string;
  sandboxEnabled?: boolean;
  sandboxApiUrl?: string;
  sandboxApiKey?: string;
  workingDir?: string;
  codexSkipGitRepoCheck?: boolean;
}): BackendRegistry {
  const backends: ExecutionBackend[] = [];
  const cwd = config.workingDir || undefined;

  if (config.codexEnabled) {
    backends.push(
      new CodexCliBackend({
        cwd,
        skipGitRepoCheck: config.codexSkipGitRepoCheck,
      }),
    );
  }

  if (config.claudeCodeEnabled) {
    backends.push(new ClaudeCodeBackend({ cwd }));
  }

  if (config.cursorEnabled) {
    backends.push(new CursorBackend({ cwd }));
  }

  if (config.vscodeAgentEnabled ?? true) {
    backends.push(
      new VSCodeAgentBackend({ endpoint: config.vscodeEndpoint ?? "http://localhost:23119" }),
    );
  }

  if ((config.sandboxEnabled ?? true) && config.sandboxApiUrl && config.sandboxApiKey) {
    backends.push(
      new CloudSandboxBackend({
        apiUrl: config.sandboxApiUrl,
        apiKey: config.sandboxApiKey,
      }),
    );
  }

  return new BackendRegistry(backends);
}

export { ClaudeCodeBackend } from "./claude-code.js";
export { CloudSandboxBackend } from "./cloud-sandbox.js";
export { CodexCliBackend } from "./codex-cli.js";
export { CursorBackend } from "./cursor.js";
export { VSCodeAgentBackend } from "./vscode-agent.js";
