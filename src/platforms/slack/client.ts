import type { IMClient, SendMessageOptions, StreamingCardSession } from "../types.js";

const SLACK_API_BASE = "https://slack.com/api";

export class SlackClient implements IMClient {
  readonly platform = "slack";
  private readonly botToken: string;
  private readonly streamContentCache = new Map<string, string>();
  private teamIdCache: string | null = null;

  constructor(config: { botToken: string }) {
    this.botToken = config.botToken;
  }

  private async getTeamId(): Promise<string> {
    if (this.teamIdCache) return this.teamIdCache;
    const data = await this.slackPost("auth.test", {});
    this.teamIdCache = (data.team_id as string) ?? "";
    return this.teamIdCache;
  }

  async sendMessage(
    channelId: string,
    content: string,
    options?: SendMessageOptions,
  ): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      channel: channelId,
      text: content,
    };

    if (options?.threadId) body.thread_ts = options.threadId;
    if (options?.markdown === false) body.mrkdwn = false;

    const data = await this.slackPost("chat.postMessage", body);
    return { messageId: (data.ts as string) ?? "" };
  }

  async updateMessage(
    messageId: string,
    content: string,
    channelId: string,
  ): Promise<void> {
    await this.slackPost("chat.update", {
      channel: channelId,
      ts: messageId,
      text: content,
    });
  }

  async sendCard(
    channelId: string,
    card: Record<string, unknown>,
  ): Promise<{ messageId: string }> {
    const data = await this.slackPost("chat.postMessage", {
      channel: channelId,
      blocks: card.blocks,
      text: (card.fallbackText as string) ?? "",
    });
    return { messageId: (data.ts as string) ?? "" };
  }

  async createStreamingCard(
    channelId: string,
    options?: { title?: string; threadId?: string; userId?: string },
  ): Promise<StreamingCardSession> {
    const teamId = await this.getTeamId();
    const body: Record<string, unknown> = {
      channel: channelId,
      thread_ts: options?.threadId,
      recipient_user_id: options?.userId,
      recipient_team_id: teamId,
    };

    const data = await this.slackPost("chat.startStream", body);
    const messageId = (data.ts as string) ?? "";
    this.streamContentCache.set(messageId, "");

    return {
      cardId: channelId,
      messageId,
      elementId: "",
      sequence: 0,
    };
  }

  async streamUpdateText(
    session: StreamingCardSession,
    content: string,
  ): Promise<void> {
    const prevContent = this.streamContentCache.get(session.messageId) ?? "";
    const delta = content.startsWith(prevContent)
      ? content.slice(prevContent.length)
      : content;

    if (!delta) return;

    session.sequence++;
    await this.slackPost("chat.appendStream", {
      channel: session.cardId,
      ts: session.messageId,
      markdown_text: delta,
    });
    this.streamContentCache.set(session.messageId, content);
  }

  async closeStreamingMode(session: StreamingCardSession): Promise<void> {
    await this.slackPost("chat.stopStream", {
      channel: session.cardId,
      ts: session.messageId,
    });
    this.streamContentCache.delete(session.messageId);
  }

  private async slackPost(
    method: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const resp = await fetch(`${SLACK_API_BASE}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await resp.json()) as Record<string, unknown>;
    if (!data.ok) {
      throw new Error(`Slack ${method} error: ${(data.error as string) ?? "unknown"}`);
    }
    return data;
  }
}
