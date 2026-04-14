import { describe, expect, it } from "vitest";

import {
  createServerPortDraftController,
  getServerPortInputValue,
  renderProfileAdminPage,
  renderProjectAccessSettingsPage,
} from "../../src/admin/profile-ui.js";

describe("renderProfileAdminPage", () => {
  it("renders a so-bridge-centered bridge layout", () => {
    const html = renderProfileAdminPage();

    expect(html).toContain("so-bridge");
    expect(html).toContain("Current Bridge");
    expect(html).toContain("Server");
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
    expect(html).toContain("Last Known Runtime");
    expect(html).toContain("Saved Port");
    expect(html).toContain("No runtime has been recorded.");
    expect(html).toContain("This recorded runtime info may be stale.");
    expect(html).toContain("The recorded runtime port differs from the saved port. This may reflect a temporary CLI override.");
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
    expect(html).toContain("currentBridge.runtimeServer");
    expect(html).toContain("currentBridge.savedServer.port");
    expect(html).toContain("runtimeServer ? runtimeServer.host + \":\" + runtimeServer.port : \"Not running\"");
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

  it("links to settings from the main admin page", () => {
    const html = renderProfileAdminPage();

    expect(html).toContain('href="/admin/settings"');
    expect(html).toContain("Settings");
  });
});

describe("renderProjectAccessSettingsPage", () => {
  it("renders the Project Access settings page", () => {
    const html = renderProjectAccessSettingsPage();

    expect(html).toContain("Server");
    expect(html).toContain("Server Port");
    expect(html).toContain("Save Server Settings");
    expect(html).toContain("Project Access");
    expect(html).toContain("Restrict Project Access");
    expect(html).toContain("Allowed Path");
    expect(html).toContain("Add Path");
    expect(html).not.toContain("Save Project Access");
    expect(html).toContain('href="/admin"');
  });

  it("wires the settings page to admin resources and directory policy endpoints", () => {
    const html = renderProjectAccessSettingsPage();

    expect(html).toContain("/api/admin/resources");
    expect(html).toContain("/api/admin/directory-policy");
    expect(html).toContain("/api/admin/server-settings");
    expect(html).toContain("This saved port will be used the next time the bridge starts.");
    expect(html).toContain("The current runtime may use a temporary CLI override instead.");
    expect(html).toContain("The bridge may access any project path.");
    expect(html).toContain("The bridge should only target the paths listed below.");
    expect(html).toContain("Add at least one allowed path before enabling restriction.");
    expect(html).toContain("Project Access updated.");
    expect(html).toContain("Server settings updated.");
    expect(html).toContain("serverPortController");
    expect(html).toContain('serverPortInput.addEventListener("input"');
    expect(html).toContain("serverPortController.render(serverPortInput)");
  });
});

describe("getServerPortInputValue", () => {
  it("preserves a dirty unsaved draft across rerenders", () => {
    expect(
      getServerPortInputValue({
        savedPort: 3000,
        draft: "4555",
        dirty: true,
      }),
    ).toBe("4555");
  });

  it("falls back to the saved port when there is no dirty draft", () => {
    expect(
      getServerPortInputValue({
        savedPort: 3000,
        draft: "4555",
        dirty: false,
      }),
    ).toBe("3000");
  });
});

describe("createServerPortDraftController", () => {
  it("preserves an unsaved draft when settings rerender for an unrelated action", () => {
    const controller = createServerPortDraftController(3000);
    const input = { value: "" };

    controller.render(input);
    expect(input.value).toBe("3000");

    controller.handleInput("4555");
    controller.render(input);

    expect(input.value).toBe("4555");
    expect(controller.getState()).toEqual({
      savedPort: 3000,
      draft: "4555",
      dirty: true,
    });
  });

  it("resets the draft after saved server settings are refreshed", () => {
    const controller = createServerPortDraftController(3000);
    const input = { value: "" };

    controller.handleInput("4555");
    controller.resetSavedPort(4600);
    controller.render(input);

    expect(input.value).toBe("4600");
    expect(controller.getState()).toEqual({
      savedPort: 4600,
      draft: "4600",
      dirty: false,
    });
  });
});
