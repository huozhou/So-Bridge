import type { SoBridgeState } from "../models/so-bridge-config.js";

export const DEFAULT_SERVER_HOST = "127.0.0.1";

export interface ServerBinding {
  host: string;
  port: number;
}

export function resolveServerBinding(
  config: { server: { port: number } },
  options: { port?: number } = {},
): ServerBinding {
  return {
    host: DEFAULT_SERVER_HOST,
    port: options.port ?? config.server.port,
  };
}

export function buildBaseUrl(binding: ServerBinding): string {
  return `http://${binding.host}:${binding.port}`;
}

export function buildAdminUrl(binding: ServerBinding): string {
  return `${buildBaseUrl(binding)}/admin`;
}

export function buildHealthUrl(binding: ServerBinding): string {
  return `${buildBaseUrl(binding)}/health`;
}

export function setRuntimeServer(
  state: SoBridgeState,
  host: string,
  port: number,
  startedAt: string,
): void {
  state.runtimeServer = {
    host,
    port,
    startedAt,
  };
}

export function clearRuntimeServer(state: SoBridgeState): void {
  state.runtimeServer = null;
}
