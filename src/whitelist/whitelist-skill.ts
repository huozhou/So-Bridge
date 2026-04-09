import type { DirectoryPolicy } from "../models/so-bridge-config.js";

export function renderWhitelistSkill(input: DirectoryPolicy): string | null {
  if (input.mode !== "restricted") {
    return null;
  }

  const allowedRoots = input.allowedPaths.map((path) => `- ${path}`).join("\n");
  const selectedLine = input.selectedPath
    ? `Selected project: ${input.selectedPath}`
    : "Selected project: (none)";

  return [
    "# Workspace Whitelist Skill",
    "",
    "Only access files and directories within the allowed roots.",
    "Before path navigation, file access, search, scan, or shell commands with paths, ask bridge to validate the path first.",
    "Do not guess that a path is safe.",
    "If bridge rejects a path, refuse the action.",
    "",
    "Allowed roots:",
    allowedRoots,
    "",
    selectedLine,
  ].join("\n");
}
