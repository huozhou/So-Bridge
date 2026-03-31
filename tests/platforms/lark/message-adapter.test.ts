import { describe, it, expect } from "vitest";
import { parseLarkEvent } from "../../../src/platforms/lark/message-adapter.js";

describe("parseLarkEvent", () => {
  it("parses im.message.receive_v1 event", () => {
    const event = {
      header: {
        event_id: "ev-lark-1",
        event_type: "im.message.receive_v1",
      },
      event: {
        message: {
          message_id: "om_abc123",
          chat_id: "oc_def456",
          message_type: "text",
          content: JSON.stringify({ text: "Please review the code" }),
          create_time: "1711234567000",
          root_id: "om_root1",
        },
        sender: {
          sender_id: {
            open_id: "ou_user1",
          },
          sender_type: "user",
        },
      },
    };

    const result = parseLarkEvent(event);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("lark");
    expect(result!.content).toBe("Please review the code");
    expect(result!.userId).toBe("ou_user1");
    expect(result!.channelId).toBe("oc_def456");
    expect(result!.messageId).toBe("om_abc123");
    expect(result!.threadId).toBe("om_root1");
  });

  it("returns null for non-message events", () => {
    const event = {
      header: {
        event_id: "ev-lark-2",
        event_type: "im.chat.member.user.added_v1",
      },
      event: {},
    };

    expect(parseLarkEvent(event)).toBeNull();
  });

  it("returns null for bot sender", () => {
    const event = {
      header: {
        event_id: "ev-lark-3",
        event_type: "im.message.receive_v1",
      },
      event: {
        message: {
          message_id: "om_xyz",
          chat_id: "oc_xyz",
          message_type: "text",
          content: JSON.stringify({ text: "bot msg" }),
          create_time: "1711234567000",
        },
        sender: {
          sender_id: { open_id: "ou_bot" },
          sender_type: "app",
        },
      },
    };

    expect(parseLarkEvent(event)).toBeNull();
  });
});
