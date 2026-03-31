export interface CliStatus {
  activeBridgeProfileName: string | null;
  directoryMode: string;
  selectedPath?: string | null;
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
  if (status.configFile) {
    deps.print(`Config file: ${status.configFile}`);
  }
  if (status.stateFile) {
    deps.print(`State file: ${status.stateFile}`);
  }
}
