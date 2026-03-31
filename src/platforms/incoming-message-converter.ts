import type { IMMessage } from "../types.js";
import type { IncomingMessage } from "./types.js";

export function convertToIMMessage(incoming: IncomingMessage): IMMessage {
  const msg: IMMessage = {
    messageId: incoming.messageId,
    userId: incoming.userId,
    channelId: incoming.channelId,
    content: incoming.content,
    timestamp: incoming.timestamp,
    platform: incoming.platform,
    metadata: {},
  };

  if (incoming.userName) msg.metadata!.userName = incoming.userName;
  if (incoming.channelName) msg.metadata!.channelName = incoming.channelName;
  if (incoming.threadId) msg.metadata!.threadId = incoming.threadId;

  return msg;
}
