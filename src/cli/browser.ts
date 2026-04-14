import { spawn } from "node:child_process";

export async function openInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "darwin"
      ? [url]
      : process.platform === "win32"
        ? ["/c", "start", "", url]
        : [url];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: process.platform !== "win32",
    });
    child.on("error", reject);
    child.on("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export function getBrowserOpenFailureMessage(url: string): string {
  if (process.platform === "linux") {
    return `Cannot open admin automatically. Open ${url} in your browser, or make sure xdg-open is available.`;
  }
  if (process.platform === "win32") {
    return `Cannot open admin automatically. Open ${url} in your browser manually.`;
  }
  return `Cannot open admin automatically. Open ${url} in your browser manually.`;
}
