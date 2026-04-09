import { describe, expect, it } from "vitest";

import { renderWhitelistSkill } from "../../src/whitelist/whitelist-skill.js";

describe("renderWhitelistSkill", () => {
  it("returns null when whitelist is not restricted", () => {
    expect(
      renderWhitelistSkill({
        mode: "open",
        allowedPaths: [],
        selectedPath: null,
      }),
    ).toBeNull();
  });

  it("renders allowed paths and selected project for restricted mode", () => {
    const skill = renderWhitelistSkill({
      mode: "restricted",
      allowedPaths: ["/repo/a", "/repo/b"],
      selectedPath: "/repo/a",
    });

    expect(skill).toContain("Only access files and directories within the allowed roots.");
    expect(skill).toContain("/repo/a");
    expect(skill).toContain("/repo/b");
    expect(skill).toContain("Selected project: /repo/a");
  });
});
