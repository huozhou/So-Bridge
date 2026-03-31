import express, { type Request, type Response, type Router } from "express";
import type { IMMessage, RawMessage } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid IMMessage: ${field} must be a non-empty string`);
  }
  return value;
}

function parseIMMessage(raw: unknown): IMMessage {
  if (!isRecord(raw)) {
    throw new Error("Invalid IMMessage: payload must be an object");
  }
  const message: IMMessage = {
    messageId: asNonEmptyString(raw.messageId, "messageId"),
    userId: asNonEmptyString(raw.userId, "userId"),
    channelId: asNonEmptyString(raw.channelId, "channelId"),
    content: asNonEmptyString(raw.content, "content"),
    timestamp: asNonEmptyString(raw.timestamp, "timestamp"),
  };
  if (raw.metadata !== undefined) {
    if (!isRecord(raw.metadata)) {
      throw new Error("Invalid IMMessage: metadata must be an object when present");
    }
    message.metadata = raw.metadata;
  }
  return message;
}

export class MessageReceiver {
  readonly port: number;
  private readonly authToken: string;

  constructor(config: { port: number; authToken: string }) {
    this.port = config.port;
    this.authToken = config.authToken;
  }

  /** Validates and wraps an incoming payload (HTTP body or WS frame) into {@link RawMessage}. */
  receive(raw: unknown): RawMessage {
    const message = parseIMMessage(raw);
    return {
      message,
      receivedAt: new Date().toISOString(),
      source: "http",
    };
  }

  private authorize(req: Request): boolean {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length) === this.authToken;
    }
    const token = req.headers["x-auth-token"];
    return typeof token === "string" && token === this.authToken;
  }

  /** Express router: POST /webhook with JSON body matching {@link IMMessage}. */
  createWebhookRouter(): Router {
    const router = express.Router();
    router.use(express.json());

    router.post("/webhook", (req: Request, res: Response) => {
      if (!this.authorize(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      try {
        const rawMessage = this.receive(req.body);
        res.status(200).json({ ok: true, messageId: rawMessage.message.messageId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bad request";
        res.status(400).json({ error: msg });
      }
    });

    return router;
  }
}
