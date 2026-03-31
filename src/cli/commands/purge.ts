export async function runPurgeCommand(
  deps: {
    purge: () => Promise<void>;
    print: (line: string) => void;
  },
): Promise<void> {
  await deps.purge();
  deps.print("so-bridge local data removed.");
}
