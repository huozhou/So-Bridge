import { describe, expect, it } from "vitest";

import { getBrowserOpenFailureMessage } from "../../src/cli/browser.js";

describe("getBrowserOpenFailureMessage", () => {
  it("returns a generic manual-open message", () => {
    const message = getBrowserOpenFailureMessage("http://127.0.0.1:3000/admin");
    expect(message).toContain("http://127.0.0.1:3000/admin");
    expect(message).toContain("Open");
  });
});
