export async function runStartCommand(
  deps: {
    port?: number;
    print: (line: string) => void;
    start?: (options: { port?: number }) => Promise<void>;
  },
): Promise<void> {
  if (deps.start) {
    await deps.start({ port: deps.port });
  }

  deps.print("so-bridge service started.");
}
