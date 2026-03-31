import type { IncomingMessage } from "../types.js";

interface SlackMessageEvent {
  type: string;
  text: string;
  user: string;
  channel: string;
  ts: string;
  client_msg_id?: string;
  thread_ts?: string;
  subtype?: string;
}

const SUPPORTED_EVENT_TYPES = new Set(["message", "app_mention"]);

interface SlackSocketModeEnvelope {
  envelope_id: string;
  type: string;
  payload?: {
    event?: SlackMessageEvent;
  };
}

export function parseSlackEvent(raw: unknown): IncomingMessage | null {
  const envelope = raw as SlackSocketModeEnvelope;
  if (envelope.type !== "events_api") return null;

  const event = envelope.payload?.event;
  if (!event || !SUPPORTED_EVENT_TYPES.has(event.type)) return null;
  if (event.type === "message" && event.subtype) return null;
  if (!event.user) return null;

  const content =
    event.type === "app_mention"
      ? event.text.replace(/^\s*<@[A-Z0-9]+>\s*/, "").trim()
      : event.text;

  return {
    platform: "slack",
    messageId: event.ts,
    userId: event.user,
    channelId: event.channel,
    content,
    threadId: event.thread_ts,
    timestamp: new Date(Number(event.ts.split(".")[0]) * 1000).toISOString(),
    rawEvent: raw,
  };
}

export function getEnvelopeId(raw: unknown): string | undefined {
  return (raw as SlackSocketModeEnvelope).envelope_id;
}
