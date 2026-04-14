import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents the CLI-first so-bridge workflow", () => {
    const readme = readFileSync("README.md", "utf8");

    expect(readme).toContain("so-bridge start");
    expect(readme).toContain("so-bridge open");
    expect(readme).toContain("so-bridge purge");
    expect(readme).toContain("npm install -g so-bridge");
    expect(readme).toContain("Admin");
    expect(readme).toContain("Slack");
    expect(readme).toContain("Lark");
  });
});
