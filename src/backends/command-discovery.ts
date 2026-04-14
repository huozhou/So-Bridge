import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function getLookupCommand(command: string): string {
  if (process.platform === "win32") {
    return `where ${command}`;
  }
  return `command -v ${command}`;
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execAsync(getLookupCommand(command));
    return true;
  } catch {
    return false;
  }
}
