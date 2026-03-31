import { homedir } from "node:os";
import { join } from "node:path";

export interface SoBridgePaths {
  configDir: string;
  dataDir: string;
  logDir: string;
  configFile: string;
  stateFile: string;
}

export function getSoBridgePaths(options: {
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
} = {}): SoBridgePaths {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? homedir();
  const env = options.env ?? process.env;
  const configDir = resolveConfigDir(platform, homeDir, env);
  const dataDir = resolveDataDir(platform, homeDir, env, configDir);
  const logDir = resolveLogDir(platform, homeDir, env);

  return {
    configDir,
    dataDir,
    logDir,
    configFile: join(configDir, "config.json"),
    stateFile: join(dataDir, "state.json"),
  };
}

function resolveConfigDir(
  platform: NodeJS.Platform,
  homeDir: string,
  env: NodeJS.ProcessEnv,
): string {
  if (platform === "darwin") {
    return join(homeDir, "Library", "Application Support", "so-bridge");
  }

  if (platform === "win32") {
    return join(env.APPDATA ?? join(homeDir, "AppData", "Roaming"), "so-bridge");
  }

  return join(env.XDG_CONFIG_HOME ?? join(homeDir, ".config"), "so-bridge");
}

function resolveDataDir(
  platform: NodeJS.Platform,
  homeDir: string,
  env: NodeJS.ProcessEnv,
  configDir: string,
): string {
  if (platform === "darwin" || platform === "win32") {
    return configDir;
  }

  return join(env.XDG_DATA_HOME ?? join(homeDir, ".local", "share"), "so-bridge");
}

function resolveLogDir(
  platform: NodeJS.Platform,
  homeDir: string,
  env: NodeJS.ProcessEnv,
): string {
  if (platform === "darwin") {
    return join(homeDir, "Library", "Logs", "so-bridge");
  }

  if (platform === "win32") {
    return join(env.LOCALAPPDATA ?? join(homeDir, "AppData", "Local"), "so-bridge", "Logs");
  }

  return join(env.XDG_STATE_HOME ?? join(homeDir, ".local", "state"), "so-bridge", "logs");
}
