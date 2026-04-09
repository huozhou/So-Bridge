import { homedir } from "node:os";
import { isAbsolute, normalize, resolve } from "node:path";

export interface PathValidationResult {
  allowed: boolean;
  normalizedPath?: string;
  rejectedPaths?: string[];
  reason?: string;
}

const PATH_PATTERN = /(?:~\/|\.{1,2}\/|\/)[^\s'"`]+/g;

export function validatePath(path: string, allowedRoots: string[]): PathValidationResult {
  const normalizedPath = normalizePath(path);
  const normalizedRoots = allowedRoots.map(normalizePath);
  const allowed = normalizedRoots.some(
    (root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`),
  );

  if (allowed) {
    return { allowed: true, normalizedPath };
  }

  return {
    allowed: false,
    normalizedPath,
    rejectedPaths: [normalizedPath],
    reason: "path is outside allowed roots",
  };
}

export function extractPathsFromCommand(command: string): string[] {
  return command.match(PATH_PATTERN) ?? [];
}

export function validateCommand(command: string, allowedRoots: string[]): PathValidationResult {
  const rejectedPaths = extractPathsFromCommand(command)
    .map((path) => validatePath(path, allowedRoots))
    .filter((result) => !result.allowed)
    .flatMap((result) => result.rejectedPaths ?? []);

  if (rejectedPaths.length === 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    rejectedPaths,
    reason: "command includes disallowed paths",
  };
}

function normalizePath(path: string): string {
  const expanded = path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
  return normalize(isAbsolute(expanded) ? expanded : resolve(expanded));
}
