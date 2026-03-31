import type { IncomingMessage } from "../types.js";

interface LarkEvent {
  header?: {
    event_id: string;
    event_type: string;
  };
  event?: {
    message?: {
      message_id: string;
      chat_id: string;
      message_type: string;
      content: string;
      create_time: string;
      root_id?: string;
    };
    sender?: {
      sender_id: { open_id: string };
      sender_type: string;
    };
  };
}

function extractTextContent(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { text?: string };
    return parsed.text ?? raw;
  } catch {
    return raw;
  }
}

export function parseLarkEvent(raw: unknown): IncomingMessage | null {
  const event = raw as LarkEvent;

  if (event.header?.event_type !== "im.message.receive_v1") return null;

  const msg = event.event?.message;
  const sender = event.event?.sender;
  if (!msg || !sender) return null;

  if (sender.sender_type !== "user") return null;

  return {
    platform: "lark",
    messageId: msg.message_id,
    userId: sender.sender_id.open_id,
    channelId: msg.chat_id,
    content: extractTextContent(msg.content),
    threadId: msg.root_id,
    timestamp: new Date(Number(msg.create_time)).toISOString(),
    rawEvent: raw,
  };
}
