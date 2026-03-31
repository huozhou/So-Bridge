import { describe, expect, it } from "vitest";
import { IntentParser } from "../../src/bridge-service/intent-parser.js";
import { SessionStore } from "../../src/bridge-service/session-store.js";
import type { RawMessage } from "../../src/types.js";

function makeRawMessage(content: string): RawMessage {
  return {
    message: {
      messageId: "msg-1",
      userId: "ou_69dc8d43433390fea7f10f58236996cd",
      channelId: "oc_12cae42b9f375c486ec32ece29e5d8b7",
      content,
      timestamp: "2026-03-26T00:00:00.000Z",
    },
    receivedAt: "2026-03-26T00:00:00.000Z",
    source: "http",
  };
}

describe("IntentParser", () => {
  it("strips leading mentions before classifying commands", async () => {
    const parser = new IntentParser({ sessionStore: new SessionStore() });

    const result = await parser.parse(makeRawMessage("@_user_1 explain auth middleware"));

    expect(result.action).toBe("explain-code");
    expect(result.rawMessage).toBe("explain auth middleware");
  });

  it("classifies greetings as generic unknown intent (dispatched to backend)", async () => {
    const parser = new IntentParser({ sessionStore: new SessionStore() });

    const result = await parser.parse(makeRawMessage("@_user_1 nihao"));

    expect(result.action).toBe("unknown");
    expect(result.rawMessage).toBe("nihao");
    expect(result.parameters.conversationMode).toBeUndefined();
  });
});
