import { describe, it, expect } from "vitest";
import type {
  TransportMode,
  TransportState,
  IMTransport,
  IMClient,
  IMPlatform,
  IncomingMessage,
  PlatformConfig,
  SendMessageOptions,
} from "../../src/platforms/types.js";

describe("platform types", () => {
  it("IncomingMessage has all required fields", () => {
    const msg: IncomingMessage = {
      platform: "slack",
      messageId: "msg-1",
      userId: "user-1",
      channelId: "ch-1",
      content: "hello",
      timestamp: new Date().toISOString(),
      rawEvent: { type: "message" },
    };
    expect(msg.platform).toBe("slack");
    expect(msg.content).toBe("hello");
    expect(msg.rawEvent).toBeDefined();
  });

  it("IncomingMessage supports optional fields", () => {
    const msg: IncomingMessage = {
      platform: "lark",
      messageId: "msg-2",
      userId: "user-2",
      channelId: "ch-2",
      content: "test",
      timestamp: new Date().toISOString(),
      rawEvent: {},
      userName: "Alice",
      channelName: "general",
      threadId: "thread-1",
    };
    expect(msg.userName).toBe("Alice");
    expect(msg.threadId).toBe("thread-1");
  });

  it("PlatformConfig accepts credentials map", () => {
    const config: PlatformConfig = {
      platform: "slack",
      transportMode: "websocket",
      credentials: {
        clientId: "id",
        clientSecret: "secret",
      },
    };
    expect(config.transportMode).toBe("websocket");
    expect(config.credentials.clientId).toBe("id");
  });
});
