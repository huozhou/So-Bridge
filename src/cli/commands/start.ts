export async function runStartCommand(
  deps: {
    start?: () => Promise<void>;
    print: (line: string) => void;
  },
): Promise<void> {
  if (deps.start) {
    await deps.start();
  }

  deps.print("so-bridge service started.");
}
