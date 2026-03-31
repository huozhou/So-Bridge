import { v4 as uuidv4 } from "uuid";

import type { IMMessage } from "./types.js";

export type { IMMessage } from "./types.js";

export function createTestMessage(
  content: string,
  userId = "user-001",
  channelId = "channel-001",
): IMMessage {
  return {
    messageId: uuidv4(),
    userId,
    channelId,
    content,
    timestamp: new Date().toISOString(),
  };
}
