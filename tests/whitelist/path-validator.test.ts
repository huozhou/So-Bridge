import { describe, expect, it } from "vitest";

import {
  extractPathsFromCommand,
  validateCommand,
  validatePath,
} from "../../src/whitelist/path-validator.js";

describe("validatePath", () => {
  it("allows a path inside an allowed root", () => {
    expect(validatePath("/repo/a/src/index.ts", ["/repo/a"]).allowed).toBe(true);
  });

  it("rejects a path outside allowed roots", () => {
    expect(validatePath("/repo/b/src/index.ts", ["/repo/a"]).allowed).toBe(false);
  });
});

describe("extractPathsFromCommand", () => {
  it("extracts obvious absolute and relative paths", () => {
    expect(extractPathsFromCommand("cat /repo/a/file.ts ./src/index.ts")).toEqual([
      "/repo/a/file.ts",
      "./src/index.ts",
    ]);
  });
});

describe("validateCommand", () => {
  it("rejects command paths outside allowed roots", () => {
    expect(validateCommand("cat /repo/private/secrets.txt", ["/repo/a"]).allowed).toBe(false);
  });
});
