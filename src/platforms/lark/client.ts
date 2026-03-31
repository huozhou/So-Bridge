import * as Lark from "@larksuiteoapi/node-sdk";
import type { IMClient, SendMessageOptions, StreamingCardSession } from "../types.js";

const MARKDOWN_ELEMENT_ID = "streaming_md";

export class LarkClient implements IMClient {
  readonly platform = "lark";
  private readonly client: Lark.Client;

  constructor(config: { appId: string; appSecret: string }) {
    this.client = new Lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      appType: Lark.AppType.SelfBuild,
      domain: Lark.Domain.Feishu,
    });
  }

  async sendMessage(
    channelId: string,
    content: string,
    options?: SendMessageOptions,
  ): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      receive_id: channelId,
      msg_type: "text",
      content: JSON.stringify({ text: content }),
    };

    if (options?.threadId) {
      body.reply_in_thread = true;
      body.root_id = options.threadId;
    }

    const res = await this.client.im.v1.message.create({
      params: { receive_id_type: "chat_id" },
      data: body as any,
    });

    return { messageId: (res as any)?.data?.message_id ?? "" };
  }

  async updateMessage(
    messageId: string,
    content: string,
    _channelId: string,
  ): Promise<void> {
    await this.client.im.v1.message.update({
      path: { message_id: messageId },
      data: {
        msg_type: "text",
        content: JSON.stringify({ text: content }),
      },
    });
  }

  async sendCard(
    channelId: string,
    card: Record<string, unknown>,
  ): Promise<{ messageId: string }> {
    const res = await this.client.im.v1.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: channelId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      },
    });

    return { messageId: (res as any)?.data?.message_id ?? "" };
  }

  async createStreamingCard(
    channelId: string,
    options?: { title?: string; threadId?: string },
  ): Promise<StreamingCardSession> {
    const cardJson = {
      schema: "2.0",
      header: {
        title: { content: options?.title || "AI Assistant", tag: "plain_text" },
      },
      config: {
        streaming_mode: true,
        update_multi: true,
        summary: { content: "" },
        streaming_config: {
          print_frequency_ms: { default: 50 },
          print_step: { default: 2 },
          print_strategy: "fast",
        },
      },
      body: {
        elements: [
          {
            tag: "markdown",
            content: "Working...",
            element_id: MARKDOWN_ELEMENT_ID,
          },
        ],
      },
    };

    const createRes = await this.client.cardkit.v1.card.create({
      data: {
        type: "card_json",
        data: JSON.stringify(cardJson),
      },
    });

    const cardId = (createRes as any)?.data?.card_id;
    if (!cardId) {
      throw new Error("Failed to create card entity: no card_id returned");
    }

    const sendRes = await this.client.im.v1.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: channelId,
        msg_type: "interactive",
        content: JSON.stringify({
          type: "card",
          data: { card_id: cardId },
        }),
      },
    });

    const messageId = (sendRes as any)?.data?.message_id ?? "";

    return {
      cardId,
      messageId,
      elementId: MARKDOWN_ELEMENT_ID,
      sequence: 1,
    };
  }

  async streamUpdateText(
    session: StreamingCardSession,
    content: string,
  ): Promise<void> {
    await this.client.cardkit.v1.cardElement.content({
      path: {
        card_id: session.cardId,
        element_id: session.elementId,
      },
      data: {
        content,
        sequence: session.sequence,
      },
    });
    session.sequence += 1;
  }

  async closeStreamingMode(session: StreamingCardSession): Promise<void> {
    await this.client.cardkit.v1.card.settings({
      path: { card_id: session.cardId },
      data: {
        settings: JSON.stringify({ config: { streaming_mode: false } }),
        sequence: session.sequence,
      },
    });
    session.sequence += 1;
  }
}
