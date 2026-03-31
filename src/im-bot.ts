import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  BridgePipeline,
  ConfirmationResponse,
  FormattedResult,
  IMMessage,
  StreamingOptions,
} from "./types.js";

export class IMBot {
  private readonly pipeline: BridgePipeline;
  private readonly webhookSecret?: string;

  constructor(config: {
    pipeline: BridgePipeline;
    webhookSecret?: string;
  }) {
    this.pipeline = config.pipeline;
    this.webhookSecret = config.webhookSecret;
  }

  async onMessage(
    message: IMMessage,
    streaming?: StreamingOptions,
  ): Promise<FormattedResult> {
    if (!message.content?.trim()) {
      throw new Error("Message content must be non-empty");
    }
    if (!message.userId?.trim()) {
      throw new Error("userId is required");
    }
    return this.pipeline.handleMessage(message, streaming);
  }

  async onConfirmation(response: ConfirmationResponse): Promise<FormattedResult> {
    return this.pipeline.handleConfirmation(response);
  }

  /** Returns true/false for verified/failed, or null if no secret is configured (skip check). */
  verifyWebhook(signature: string, body: string): boolean | null {
    if (!this.webhookSecret) {
      return null;
    }
    const expected = createHmac("sha256", this.webhookSecret)
      .update(body, "utf8")
      .digest("hex");
    const normalized = signature.trim().replace(/^sha256=/i, "");
    if (normalized.length !== expected.length) {
      return false;
    }
    try {
      return timingSafeEqual(Buffer.from(normalized, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }
}
