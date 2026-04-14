import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents the CLI-first so-bridge workflow", () => {
    const readme = readFileSync("README.md", "utf8");
    const readmeZh = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("so-bridge start");
    expect(readme).toContain("so-bridge open");
    expect(readme).toContain("so-bridge purge");
    expect(readme).toContain("npm install -g so-bridge");
    expect(readme).toContain("Admin");
    expect(readme).toContain("Slack");
    expect(readme).toContain("Lark");
    expect(readme).toContain("so-bridge config set port 3456");
    expect(readme).toContain("so-bridge start --port 3456");
    expect(readme).toContain("temporary runtime override");
    expect(readme).toContain("saved port");

    expect(readmeZh).toContain("so-bridge config set port 3456");
    expect(readmeZh).toContain("so-bridge start --port 3456");
    expect(readmeZh).toContain("临时覆盖端口");
    expect(readmeZh).toContain("保存到本地配置");
  });
});
