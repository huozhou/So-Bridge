import { describe, expect, it } from "vitest";

import { renderProfileAdminPage } from "../../src/admin/profile-ui.js";

describe("renderProfileAdminPage", () => {
  it("renders a so-bridge-centered bridge layout", () => {
    const html = renderProfileAdminPage();

    expect(html).toContain("so-bridge");
    expect(html).toContain("Current Bridge");
    expect(html).toContain("Bot Connection");
    expect(html).toContain("AI Assistant");
    expect(html).not.toContain("Use This Bridge");
    expect(html).not.toContain("Reload Status");
  });

  it("does not expose internal management terms in the primary ui", () => {
    const html = renderProfileAdminPage();

    expect(html).not.toContain("Resources");
    expect(html).not.toContain("Bridge Profiles");
    expect(html).not.toContain("Diagnostics And Tests");
  });

  it("does not render custom Bot or AI name inputs", () => {
    const html = renderProfileAdminPage();

    expect(html).not.toContain('name="name"');
    expect(html).toContain("Lark (Feishu)");
    expect(html).toContain("Codex CLI");
  });

  it("uses the monochrome design token set", () => {
    const html = renderProfileAdminPage();

    expect(html).toContain("--bg: #ffffff");
    expect(html).toContain("--panel: #ffffff");
    expect(html).toContain("--ink: #111111");
    expect(html).toContain("--muted: #6b7280");
  });

  it("contains English-only user-facing copy", () => {
    const html = renderProfileAdminPage();

    expect(html).not.toMatch(/[\u4e00-\u9fff]/);
    expect(html).toContain("Not configured");
    expect(html).not.toContain("Project Access");
    expect(html).not.toContain("Active Bridge:");
    expect(html).not.toContain("Project Whitelist");
  });

  it("contains fetch-driven wiring for resources and current bridge state", () => {
    const html = renderProfileAdminPage();

    expect(html).toContain("/api/admin/current-bridge");
    expect(html).toContain("/api/admin/resources");
    expect(html).toContain("/api/admin/bot-integrations");
    expect(html).toContain("/api/admin/ai-assistants");
    expect(html).toContain('type="module"');
    expect(html).toContain("Add Bot Connection");
    expect(html).toContain("Add AI Assistant");
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
    expect(html).toContain("Selected");
    expect(html).toContain("Configured");
    expect(html).toContain("Incomplete");
    expect(html).toContain("Bot Token is required.");
    expect(html).toContain("App Token is required.");
    expect(html).toContain("App ID is required.");
    expect(html).toContain("App Secret is required.");
    expect(html).not.toContain("/api/admin/directory-policy");
    expect(html).not.toContain("Apply Project Whitelist");
  });
});
