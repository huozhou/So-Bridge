export async function runOpenCommand(
  deps: {
    statusProvider: () => Promise<{
      runtimeReachable: boolean;
      runtimeAdminUrl: string | null;
      savedAdminUrl: string;
    }>;
    openUrl: (url: string) => Promise<void>;
    print: (line: string) => void;
  },
): Promise<void> {
  const status = await deps.statusProvider();
  if (status.runtimeReachable && status.runtimeAdminUrl) {
    await deps.openUrl(status.runtimeAdminUrl);
    deps.print(`Opened ${status.runtimeAdminUrl}`);
    return;
  }

  await deps.openUrl(status.savedAdminUrl);
  deps.print(`Runtime admin is unreachable. Opened configured admin URL: ${status.savedAdminUrl}`);
}
