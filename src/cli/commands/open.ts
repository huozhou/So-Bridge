export async function runOpenCommand(
  deps: {
    isReachable: () => Promise<boolean>;
    openUrl: (url: string) => Promise<void>;
    url: string;
    print: (line: string) => void;
  },
): Promise<void> {
  if (!(await deps.isReachable())) {
    throw new Error(
      `Cannot open admin because the local bridge is not running on ${deps.url}`,
    );
  }

  await deps.openUrl(deps.url);
  deps.print(`Opened ${deps.url}`);
}
