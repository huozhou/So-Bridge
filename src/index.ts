import express, { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { createProfileAdminRouter } from "./admin/profile-routes.js";
import { ProfileAdminService } from "./admin/profile-service.js";
import { getSoBridgePaths } from "./app-paths.js";
import type { SoBridgeConfig, SoBridgeState } from "./models/so-bridge-config.js";
import { convertToIMMessage } from "./platforms/incoming-message-converter.js";
import { buildActiveBridgeRuntime } from "./runtime/app-runtime.js";
import { ProfileRuntimeManager } from "./runtime/profile-runtime-manager.js";
import {
  buildAdminUrl,
  buildBaseUrl,
  clearRuntimeServer,
  resolveServerBinding,
  setRuntimeServer,
  type ServerBinding,
} from "./server/server-binding.js";
import { SoBridgeStore } from "./storage/so-bridge-store.js";
import type { IMClient, IncomingMessage, StreamingCardSession } from "./platforms/types.js";
import type { StreamingOptions } from "./types.js";

const DEFAULT_AUTH_TOKEN = "dev-token";

function parseConfirmationResponse(body: unknown): import("./types.js").ConfirmationResponse {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object");
  }
  const o = body as Record<string, unknown>;
  if (typeof o.taskId !== "string" || !o.taskId.trim()) {
    throw new Error("taskId must be a non-empty string");
  }
  if (typeof o.approved !== "boolean") {
    throw new Error("approved must be a boolean");
  }
  if (!Array.isArray(o.approvedActions)) {
    throw new Error("approvedActions must be an array");
  }
  if (!o.approvedActions.every((id) => typeof id === "string")) {
    throw new Error("approvedActions must contain only strings");
  }
  return {
    taskId: o.taskId,
    approved: o.approved,
    approvedActions: o.approvedActions,
  };
}

/** Builds a full {@link IMMessage} for the bridge (all string fields required and non-empty). */
function parseWebhookMessage(body: unknown): import("./types.js").IMMessage {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object");
  }
  const o = body as Record<string, unknown>;
  if (typeof o.content !== "string") {
    throw new Error("content must be a string");
  }
  const userId =
    typeof o.userId === "string" && o.userId.trim() ? o.userId : "user-001";
  const channelId =
    typeof o.channelId === "string" && o.channelId.trim() ? o.channelId : "channel-001";
  const messageId =
    typeof o.messageId === "string" && o.messageId.trim() ? o.messageId : uuidv4();
  const timestamp =
    typeof o.timestamp === "string" && o.timestamp.trim()
      ? o.timestamp
      : new Date().toISOString();
  const msg: import("./types.js").IMMessage = {
    messageId,
    userId,
    channelId,
    content: o.content,
    timestamp,
  };
  if (o.metadata !== undefined) {
    if (typeof o.metadata !== "object" || o.metadata === null || Array.isArray(o.metadata)) {
      throw new Error("metadata must be an object when present");
    }
    msg.metadata = o.metadata as Record<string, unknown>;
  }
  return msg;
}

function isClientErrorMessage(msg: string): boolean {
  return (
    msg.includes("must be") ||
    msg.includes("must contain") ||
    msg === "Message content must be non-empty" ||
    msg === "userId is required"
  );
}

function authorizeRequest(req: Request, authToken: string): boolean {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length) === authToken;
  }
  const token = req.headers["x-auth-token"];
  return typeof token === "string" && token === authToken;
}

function extractErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return String(err ?? "Unknown error");
  const responseData = (err as { response?: { data?: { msg?: unknown } } }).response?.data;
  if (typeof responseData?.msg === "string" && responseData.msg.trim()) return responseData.msg;
  if (err instanceof Error) return err.message;
  return String(err);
}

function buildUserFacingError(err: unknown): string {
  const raw = extractErrorMessage(err);
  const lower = raw.toLowerCase();

  if (lower.includes("cardkit:card:write") || lower.includes("99991672")) {
    return (
      "[Configuration Error] Feishu bot is missing the required permission: cardkit:card:write\n" +
      "Please enable this scope in Feishu Developer Console and retry.\n" +
      "See README > Feishu Bot Requirements for details."
    );
  }

  if (raw.includes("configured but not available on this machine")) {
    return `[Configuration Error] ${raw}`;
  }

  if (lower.includes("spawn codex") && lower.includes("enoent")) {
    return (
      '[Configuration Error] Backend "codex-cli" is not installed.\n' +
      "Install: npm install -g @openai/codex\n" +
      "Make sure the codex binary is in PATH, then restart."
    );
  }

  if (lower.includes("spawn claude") && lower.includes("enoent")) {
    return (
      '[Configuration Error] Backend "claude-code" is not installed.\n' +
      "Install: npm install -g @anthropic-ai/claude-code\n" +
      "Make sure the claude binary is in PATH, then restart."
    );
  }

  if (lower.includes("spawn cursor") && lower.includes("enoent")) {
    return (
      '[Configuration Error] Backend "cursor" is not installed.\n' +
      "Install the Cursor IDE and enable CLI integration.\n" +
      "Make sure the cursor binary is in PATH, then restart."
    );
  }

  if (lower.includes("not inside a trusted directory")) {
    return (
      "[Configuration Error] Codex CLI rejected the working directory as untrusted.\n" +
      "Set agents.codexCli.workingDir to a trusted directory or keep agents.codexCli.skipGitRepoCheck=true in config"
    );
  }

  return `[Error] ${raw || "Unknown error"}`;
}

export async function startSoBridgeServer(options: { port?: number } = {}): Promise<void> {
  const paths = getSoBridgePaths();
  const store = new SoBridgeStore(paths);
  let createdDefaultConfig = false;
  let createdDefaultState = false;

  const loadSnapshot = async (): Promise<{ config: SoBridgeConfig; state: SoBridgeState }> => {
    const result = await store.readAll();
    createdDefaultConfig = createdDefaultConfig || result.createdDefaultConfig;
    createdDefaultState = createdDefaultState || result.createdDefaultState;
    return {
      config: result.config,
      state: result.state,
    };
  };

  const runtimeManager = new ProfileRuntimeManager({
    loadSnapshot,
    saveState: async (state) => {
      const current = await store.readAll();
      await store.writeState(state);
      if (current.createdDefaultConfig) {
        createdDefaultConfig = true;
      }
    },
    buildRuntime: buildActiveBridgeRuntime,
  });
  const runtime = await runtimeManager.initialize();
  const platformManager = runtime.platformManager;
  const effectiveBinding = resolveServerBinding(runtimeManager.getRuntime().config, options);
  let activeBinding: ServerBinding = effectiveBinding;

  const app = express();
  app.use(
    express.json({
      verify: (_req, _res, buf) => {
        (_req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(
    createProfileAdminRouter(
      new ProfileAdminService({
        loadSnapshot,
        saveSnapshot: async (config, state) => {
          await store.writeConfig(config);
          await store.writeState(state);
        },
        activateProfile: async (profileId) => {
          await runtimeManager.setActiveProfile(profileId);
        },
      }),
    ),
  );

  app.post("/webhook", async (req: Request, res: Response) => {
    const activeRuntime = runtimeManager.getRuntime();
    if (!authorizeRequest(req, activeRuntime.config.security.authToken || DEFAULT_AUTH_TOKEN)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString("utf8") ?? "";
    const signature = req.headers["x-signature"] ?? req.headers["x-slack-signature"];
    if (typeof signature === "string") {
      const verified = activeRuntime.bot.verifyWebhook(signature, rawBody);
      if (verified === false) {
        res.status(403).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    try {
      const message = parseWebhookMessage(req.body);
      const result = await activeRuntime.bot.onMessage(message);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      res.status(isClientErrorMessage(msg) ? 400 : 500).json({ error: msg });
    }
  });

  app.post("/confirm", async (req: Request, res: Response) => {
    const activeRuntime = runtimeManager.getRuntime();
    if (!authorizeRequest(req, activeRuntime.config.security.authToken || DEFAULT_AUTH_TOKEN)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const response = parseConfirmationResponse(req.body);
      const result = await activeRuntime.bot.onConfirmation(response);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: msg });
    }
  });

  app.get("/health", async (_req: Request, res: Response) => {
    const activeRuntime = runtimeManager.getRuntime();
    const status = runtimeManager.getStatus();
    const platforms = activeRuntime.platformManager.getPlatforms().map((p) => p.name);
    res.json({
      status: "ok",
      activeBridgeProfileId: status.activeBridgeProfileId,
      activeBridgeProfileName: status.activeBridgeProfileName,
      directoryMode: status.directoryMode,
      backends: activeRuntime.availableBackends,
      platforms,
      configPath: store.getPaths().configFile,
      statePath: store.getPaths().stateFile,
      server: {
        host: activeBinding.host,
        port: activeBinding.port,
      },
    });
  });

  const persistRuntimeServer = async (binding: ServerBinding | null, startedAt?: string): Promise<void> => {
    const current = await store.readAll();
    if (binding && startedAt) {
      setRuntimeServer(current.state, binding.host, binding.port, startedAt);
    } else {
      clearRuntimeServer(current.state);
    }
    await store.writeState(current.state);
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let shuttingDown = false;
    let startupComplete = false;

    const finishResolve = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const finishReject = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const server = app.listen(effectiveBinding.port, effectiveBinding.host);

    const cleanupSignalHandlers = () => {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
    };

    const handleSignal = async () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      cleanupSignalHandlers();

      try {
        await persistRuntimeServer(null);
      } catch (error) {
        console.error("Failed to clear runtime server state during shutdown:", error);
      }

      server.close(() => {
        process.exit(0);
      });
    };

    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);

    const rejectStartup = (error: Error) => {
      cleanupSignalHandlers();
      server.close();
      finishReject(error);
    };

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (startupComplete || settled) {
        return;
      }

      if (error.code === "EADDRINUSE") {
        rejectStartup(new Error(`Port ${effectiveBinding.port} is already in use`));
        return;
      }

      rejectStartup(error);
    });

    server.once("listening", async () => {
      try {
        const address = server.address();
        if (address && typeof address === "object") {
          activeBinding = {
            host: effectiveBinding.host,
            port: address.port,
          };
        }

        const status = runtimeManager.getStatus();
        console.log(`so-bridge listening on ${buildBaseUrl(activeBinding)}`);
        console.log(`Admin console: ${buildAdminUrl(activeBinding)}`);
        console.log(`Active bridge: ${status.activeBridgeProfileName ?? "(none)"}`);
        console.log(`Available AI assistants: ${runtime.availableBackends.join(", ") || "(none)"}`);
        console.log(`Config: ${store.getPaths().configFile}`);
        console.log(`State: ${store.getPaths().stateFile}`);
        if (createdDefaultConfig || createdDefaultState) {
          console.log("Created default so-bridge config/state on startup. Open /admin to finish setup.");
        }

        for (const p of platformManager.getPlatforms()) {
          p.transport.on("message", async (incoming: IncomingMessage) => {
            try {
              const activeRuntime = runtimeManager.getRuntime();
              const imMessage = convertToIMMessage(incoming);
              console.log(`[${p.name}] received message from ${imMessage.userId}: "${imMessage.content.slice(0, 80)}"`);
              const replyThreadId = incoming.threadId ?? incoming.messageId;
              const streaming = buildStreamingOptions(p.client, incoming.channelId, replyThreadId, incoming.userId);
              const result = await activeRuntime.bot.onMessage(imMessage, streaming);
              console.log(`[${p.name}] task done: ${result.summary.slice(0, 120)} (stdout ${result.markdown.length} chars)`);

              if (!streaming && result.markdown) {
                await p.client.sendMessage(incoming.channelId, result.markdown, {
                  threadId: replyThreadId,
                });
              }
            } catch (err) {
              console.error(`[${p.name}] message handling error:`, err);
              const userError = buildUserFacingError(err);
              try {
                await sendErrorCard(p.client, incoming.channelId, userError);
              } catch (sendErr) {
                console.error(`[${p.name}] failed to send error message to IM:`, sendErr);
              }
            }
          });
          p.transport.on("stateChange", (state) => {
            console.log(`[${p.name}] transport state: ${state}`);
          });
          p.transport.on("error", (err) => {
            console.error(`[${p.name}] transport error:`, err);
          });
        }

        await platformManager.startAll();
        const platformNames = platformManager.getPlatforms().map((p) => p.name);
        if (platformNames.length > 0) {
          console.log(`Bot Connections: ${platformNames.join(", ")}`);
        }

        await persistRuntimeServer(activeBinding, new Date().toISOString());
        startupComplete = true;
        finishResolve();
      } catch (error) {
        cleanupSignalHandlers();
        try {
          await persistRuntimeServer(null);
        } catch (clearError) {
          console.error("Failed to clear runtime server state after startup failure:", clearError);
        }
        server.close();
        finishReject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

function buildStreamingOptions(
  client: IMClient,
  channelId: string,
  threadId?: string,
  userId?: string,
): StreamingOptions | undefined {
  if (!client.createStreamingCard || !client.streamUpdateText || !client.closeStreamingMode) {
    return undefined;
  }

  let session: StreamingCardSession | null = null;
  let pending: Promise<void> = Promise.resolve();

  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = pending.then(fn, fn);
    pending = next.then(() => {}, () => {});
    return next;
  };

  return {
    sendInitial: async (text: string) => {
      return enqueue(async () => {
        session = await client.createStreamingCard!(channelId, { threadId, userId });
        await client.streamUpdateText!(session, text);
        return session.messageId;
      });
    },
    updateMessage: async (_messageId: string, text: string) => {
      return enqueue(async () => {
        if (!session) return;
        await client.streamUpdateText!(session, text);
      });
    },
    finalize: async () => {
      return enqueue(async () => {
        if (!session) return;
        await client.closeStreamingMode!(session);
      });
    },
  };
}

async function sendErrorCard(
  client: IMClient,
  channelId: string,
  errorText: string,
): Promise<void> {
  if (client.platform === "lark" && client.sendCard) {
    await client.sendCard(channelId, {
      schema: "2.0",
      header: { title: { content: "Error", tag: "plain_text" } },
      body: {
        elements: [{ tag: "markdown", content: errorText }],
      },
    });
    return;
  }
  await client.sendMessage(channelId, errorText);
}

if (typeof require !== "undefined" && require.main === module) {
  void startSoBridgeServer();
}
