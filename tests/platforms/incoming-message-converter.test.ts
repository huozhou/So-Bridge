import { describe, it, expect } from "vitest";
import { convertToIMMessage } from "../../src/platforms/incoming-message-converter.js";
import type { IncomingMessage } from "../../src/platforms/types.js";

describe("convertToIMMessage", () => {
  it("converts IncomingMessage to IMMessage with platform field", () => {
    const incoming: IncomingMessage = {
      platform: "slack",
      messageId: "msg-1",
      userId: "U123",
      userName: "alice",
      channelId: "C456",
      channelName: "general",
      content: "Review PR #42 for me",
      threadId: "thread-1",
      timestamp: "2026-03-24T10:00:00.000Z",
      rawEvent: { type: "message" },
    };

    const result = convertToIMMessage(incoming);

    expect(result.messageId).toBe("msg-1");
    expect(result.userId).toBe("U123");
    expect(result.channelId).toBe("C456");
    expect(result.content).toBe("Review PR #42 for me");
    expect(result.timestamp).toBe("2026-03-24T10:00:00.000Z");
    expect(result.platform).toBe("slack");
  });

  it("puts platform-specific info into metadata", () => {
    const incoming: IncomingMessage = {
      platform: "lark",
      messageId: "msg-2",
      userId: "ou_abc",
      channelId: "oc_def",
      content: "test",
      timestamp: "2026-03-24T10:00:00.000Z",
      rawEvent: { header: { event_id: "ev-1" } },
      userName: "Bob",
      channelName: "dev-chat",
      threadId: "root-msg-1",
    };

    const result = convertToIMMessage(incoming);

    expect(result.metadata?.userName).toBe("Bob");
    expect(result.metadata?.channelName).toBe("dev-chat");
    expect(result.metadata?.threadId).toBe("root-msg-1");
  });

  it("handles minimal IncomingMessage (no optional fields)", () => {
    const incoming: IncomingMessage = {
      platform: "lark",
      messageId: "msg-3",
      userId: "user-3",
      channelId: "ch-3",
      content: "hello",
      timestamp: "2026-03-24T12:00:00.000Z",
      rawEvent: {},
    };

    const result = convertToIMMessage(incoming);

    expect(result.platform).toBe("lark");
    expect(result.metadata?.userName).toBeUndefined();
  });
});
