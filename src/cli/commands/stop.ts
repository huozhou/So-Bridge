export async function runStopCommand(
  deps: {
    print: (line: string) => void;
  },
): Promise<void> {
  deps.print("so-bridge stop is not implemented for unmanaged foreground mode.");
}
