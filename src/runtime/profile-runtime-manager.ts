import type { SoBridgeConfig, SoBridgeState } from "../models/so-bridge-config.js";
import { resolveActiveBridge, type ActiveBridgeDefinition } from "./active-bridge.js";

export interface ProfileReloadStatus {
  ok: boolean;
  at: string;
  error: string;
}

export interface ProfileRuntimeStatus {
  activeBridgeProfileId: string | null;
  activeBridgeProfileName: string | null;
  directoryMode: SoBridgeConfig["directoryPolicy"]["mode"];
  lastReload: ProfileReloadStatus | null;
}

export class ProfileRuntimeManager<T = unknown> {
  private runtime: T | null = null;
  private status: ProfileRuntimeStatus = {
    activeBridgeProfileId: null,
    activeBridgeProfileName: null,
    directoryMode: "open",
    lastReload: null,
  };

  constructor(
    private readonly deps: {
      loadSnapshot: () => Promise<{ config: SoBridgeConfig; state: SoBridgeState }>;
      buildRuntime: (active: ActiveBridgeDefinition) => Promise<T>;
      saveState: (state: SoBridgeState) => Promise<void>;
    },
  ) {}

  async initialize(): Promise<T> {
    return this.applySnapshot(await this.deps.loadSnapshot());
  }

  async reload(): Promise<T> {
    try {
      return await this.applySnapshot(await this.deps.loadSnapshot());
    } catch (error) {
      this.status.lastReload = {
        ok: false,
        at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  getRuntime(): T {
    if (this.runtime === null) {
      throw new Error("Runtime is not initialized");
    }

    return this.runtime;
  }

  getStatus(): ProfileRuntimeStatus {
    return {
      ...this.status,
      lastReload: this.status.lastReload ? { ...this.status.lastReload } : null,
    };
  }

  async setActiveProfile(profileId: string | null): Promise<T> {
    const snapshot = await this.deps.loadSnapshot();
    const nextState: SoBridgeState = {
      ...snapshot.state,
      activeBridgeProfileId: profileId,
    };

    await this.deps.saveState(nextState);
    return this.applySnapshot({
      config: snapshot.config,
      state: nextState,
    });
  }

  private async applySnapshot(snapshot: {
    config: SoBridgeConfig;
    state: SoBridgeState;
  }): Promise<T> {
    const active = resolveActiveBridge(snapshot.config, snapshot.state.activeBridgeProfileId);
    const runtime = await this.deps.buildRuntime(active);

    this.runtime = runtime;
    this.status = {
      activeBridgeProfileId: active.bridgeProfile?.id ?? null,
      activeBridgeProfileName: active.bridgeProfile?.name ?? null,
      directoryMode: active.directoryPolicy.mode,
      lastReload: {
        ok: true,
        at: new Date().toISOString(),
        error: "",
      },
    };

    return runtime;
  }
}
