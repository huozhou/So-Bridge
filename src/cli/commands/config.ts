export async function runConfigCommand(
  deps: {
    args: string[];
    parsePort: (value: string | undefined) => number;
    print: (line: string) => void;
    setPort?: (port: number) => Promise<void>;
  },
): Promise<void> {
  if (deps.args.length !== 3) {
    throw new Error("Usage: so-bridge config set port <number>");
  }

  const [action, key, value] = deps.args;

  if (action !== "set" || key !== "port") {
    throw new Error("Usage: so-bridge config set port <number>");
  }

  const port = deps.parsePort(value);
  if (deps.setPort) {
    await deps.setPort(port);
  }

  deps.print(`Saved port: ${port}`);
}
