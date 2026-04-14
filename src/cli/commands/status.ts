export interface CliStatus {
  activeBridgeProfileName: string | null;
  directoryMode: string;
  selectedPath?: string | null;
  savedPort: number;
  runtimePort: number | null;
  runtimeReachable: boolean;
  savedAdminUrl: string;
  runtimeAdminUrl: string | null;
  configFile?: string;
  stateFile?: string;
}

export async function runStatusCommand(
  deps: {
    print: (line: string) => void;
    statusProvider: () => Promise<CliStatus>;
  },
): Promise<void> {
  const status = await deps.statusProvider();

  deps.print(`Active bridge: ${status.activeBridgeProfileName ?? "(none)"}`);
  deps.print(`Directory mode: ${status.directoryMode}`);
  deps.print(`Selected path: ${status.selectedPath ?? "(none)"}`);
  deps.print(`Saved port: ${status.savedPort}`);
  if (status.runtimePort === null) {
    deps.print("Runtime port: (not running)");
  } else if (status.runtimeReachable) {
    deps.print(`Runtime port: ${status.runtimePort}`);
  } else {
    deps.print(`Runtime port: ${status.runtimePort} (stale/unreachable)`);
  }
  if (status.runtimeReachable && status.runtimePort !== null && status.runtimePort !== status.savedPort) {
    deps.print("Temporary port override active");
  }
  if (status.configFile) {
    deps.print(`Config file: ${status.configFile}`);
  }
  if (status.stateFile) {
    deps.print(`State file: ${status.stateFile}`);
  }
}
