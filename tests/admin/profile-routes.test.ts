import { describe, expect, it, vi } from "vitest";

import { createProfileAdminRouter } from "../../src/admin/profile-routes.js";

type InvokeResult = {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  text?: string;
};

async function invokeRoute(
  method: string,
  url: string,
  serviceOverrides: Partial<Parameters<typeof createProfileAdminRouter>[0]> = {},
  body?: unknown,
): Promise<InvokeResult> {
  const router = createProfileAdminRouter({
    getCurrentBridge: vi.fn(),
    getResources: vi.fn(),
    createBotIntegration: vi.fn(),
    updateBotIntegration: vi.fn(),
    deleteBotIntegration: vi.fn(),
    createAIAssistant: vi.fn(),
    updateAIAssistant: vi.fn(),
    deleteAIAssistant: vi.fn(),
    createBridgeProfile: vi.fn(),
    activateBridgeProfile: vi.fn(),
    updateDirectoryPolicy: vi.fn(),
    ...serviceOverrides,
  });

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    const req = {
      method,
      url,
      body,
      params: {},
      headers: body ? { "content-type": "application/json" } : {},
    };
    const res = {
      statusCode: 200,
      type(value: string) {
        headers["content-type"] = value === "html" ? "text/html; charset=utf-8" : value;
        return this;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        headers["content-type"] = headers["content-type"] ?? "application/json; charset=utf-8";
        resolve({ status: this.statusCode, headers, body: payload });
        return this;
      },
      send(payload: unknown) {
        resolve({ status: this.statusCode, headers, text: String(payload) });
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      end(payload?: unknown) {
        resolve({
          status: this.statusCode,
          headers,
          text: payload === undefined ? "" : String(payload),
        });
        return this;
      },
    };

    router.handle(req as never, res as never, reject);
  });
}

describe("createProfileAdminRouter", () => {
  it("returns the bridge-oriented admin page for /admin", async () => {
    const response = await invokeRoute("GET", "/admin");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Current Bridge");
    expect(response.text).toContain("Bot Connection");
    expect(response.text).toContain("AI Assistant");
    expect(response.text).toContain("Add Bot Connection");
    expect(response.text).toContain("Add AI Assistant");
    expect(response.text).toContain("Delete");
    expect(response.text).toContain("/api/admin/current-bridge");
    expect(response.text).toContain("/api/admin/resources");
  });

  it("returns the current bridge payload", async () => {
    const response = await invokeRoute("GET", "/api/admin/current-bridge", {
      getCurrentBridge: vi.fn().mockResolvedValue({
        activeBridgeProfileId: "profile_1",
        botConnectionLabel: "Slack",
        aiAssistantLabel: "Codex CLI",
        bridgeState: "Enabled",
        directoryMode: "restricted",
        selectedPath: "/repo/a",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      activeBridgeProfileId: "profile_1",
      botConnectionLabel: "Slack",
      aiAssistantLabel: "Codex CLI",
      bridgeState: "Enabled",
      directoryMode: "restricted",
      selectedPath: "/repo/a",
    });
  });

  it("creates a bridge profile", async () => {
    const payload = {
      name: "Slack -> Codex",
      botIntegrationId: "bot_1",
      aiAssistantId: "ai_1",
    };
    const createBridgeProfile = vi.fn().mockResolvedValue([{ id: "profile_1", ...payload }]);

    const response = await invokeRoute(
      "POST",
      "/api/admin/bridge-profiles",
      { createBridgeProfile },
      payload,
    );

    expect(createBridgeProfile).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(201);
    expect(response.body).toEqual([{ id: "profile_1", ...payload }]);
  });

  it("creates a Bot integration", async () => {
    const payload = {
      name: "Slack Main Bot",
      platform: "slack",
      config: { botToken: "xoxb", appToken: "xapp" },
    };
    const createBotIntegration = vi.fn().mockResolvedValue({ id: "bot_1", ...payload });

    const response = await invokeRoute(
      "POST",
      "/api/admin/bot-integrations",
      { createBotIntegration },
      payload,
    );

    expect(createBotIntegration).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "bot_1", ...payload });
  });

  it("updates a Bot integration", async () => {
    const payload = {
      name: "Slack",
      platform: "slack",
      config: { botToken: "xoxb", appToken: "xapp" },
    };
    const updateBotIntegration = vi.fn().mockResolvedValue({ id: "bot_1", ...payload });

    const response = await invokeRoute(
      "PUT",
      "/api/admin/bot-integrations/bot_1",
      { updateBotIntegration },
      payload,
    );

    expect(updateBotIntegration).toHaveBeenCalledWith("bot_1", payload);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "bot_1", ...payload });
  });

  it("deletes a Bot integration", async () => {
    const deleteBotIntegration = vi.fn().mockResolvedValue({ ok: true });

    const response = await invokeRoute(
      "DELETE",
      "/api/admin/bot-integrations/bot_1",
      { deleteBotIntegration },
    );

    expect(deleteBotIntegration).toHaveBeenCalledWith("bot_1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("creates an AI assistant", async () => {
    const payload = {
      name: "Codex",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    };
    const createAIAssistant = vi.fn().mockResolvedValue({ id: "ai_1", ...payload });

    const response = await invokeRoute(
      "POST",
      "/api/admin/ai-assistants",
      { createAIAssistant },
      payload,
    );

    expect(createAIAssistant).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "ai_1", ...payload });
  });

  it("updates an AI assistant", async () => {
    const payload = {
      name: "Codex CLI",
      provider: "codex-cli",
      config: { skipGitRepoCheck: true },
    };
    const updateAIAssistant = vi.fn().mockResolvedValue({ id: "ai_1", ...payload });

    const response = await invokeRoute(
      "PUT",
      "/api/admin/ai-assistants/ai_1",
      { updateAIAssistant },
      payload,
    );

    expect(updateAIAssistant).toHaveBeenCalledWith("ai_1", payload);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "ai_1", ...payload });
  });

  it("deletes an AI assistant", async () => {
    const deleteAIAssistant = vi.fn().mockResolvedValue({ ok: true });

    const response = await invokeRoute(
      "DELETE",
      "/api/admin/ai-assistants/ai_1",
      { deleteAIAssistant },
    );

    expect(deleteAIAssistant).toHaveBeenCalledWith("ai_1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
