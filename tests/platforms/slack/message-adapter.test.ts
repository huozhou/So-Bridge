import { describe, it, expect } from "vitest";
import { parseSlackEvent } from "../../../src/platforms/slack/message-adapter.js";

describe("parseSlackEvent", () => {
  it("parses a Socket Mode message event", () => {
    const event = {
      envelope_id: "env-1",
      type: "events_api",
      payload: {
        event: {
          type: "message",
          text: "Review PR #42 for me",
          user: "U12345",
          channel: "C67890",
          ts: "1711234567.000100",
          client_msg_id: "msg-abc",
        },
      },
    };

    const result = parseSlackEvent(event);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("slack");
    expect(result!.content).toBe("Review PR #42 for me");
    expect(result!.userId).toBe("U12345");
    expect(result!.channelId).toBe("C67890");
    expect(result!.messageId).toBe("1711234567.000100");
  });

  it("parses an app_mention event and strips the mention prefix", () => {
    const event = {
      envelope_id: "env-2",
      type: "events_api",
      payload: {
        event: {
          type: "app_mention",
          text: "<@U0APXMNGTLH> hello",
          user: "U12345",
          channel: "C67890",
          ts: "1711234567.000100",
        },
      },
    };

    const result = parseSlackEvent(event);
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("slack");
    expect(result!.content).toBe("hello");
    expect(result!.userId).toBe("U12345");
    expect(result!.channelId).toBe("C67890");
  });

  it("returns null for unsupported event types", () => {
    const event = {
      envelope_id: "env-2b",
      type: "events_api",
      payload: {
        event: {
          type: "reaction_added",
          user: "U12345",
          ts: "1711234567.000100",
        },
      },
    };

    expect(parseSlackEvent(event)).toBeNull();
  });

  it("returns null for bot messages (subtype present)", () => {
    const event = {
      envelope_id: "env-3",
      type: "events_api",
      payload: {
        event: {
          type: "message",
          subtype: "bot_message",
          text: "I am bot",
          user: "",
          channel: "C67890",
          ts: "1711234567.000100",
        },
      },
    };

    expect(parseSlackEvent(event)).toBeNull();
  });

  it("returns null for non events_api envelope types", () => {
    const event = {
      envelope_id: "env-4",
      type: "hello",
    };

    expect(parseSlackEvent(event)).toBeNull();
  });
});
