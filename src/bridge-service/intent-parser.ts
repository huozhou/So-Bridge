import type { ParsedIntent, RawMessage } from "../types.js";
import type { SessionStore } from "./session-store.js";

function extractPrNumber(text: string): string | undefined {
  const m =
    text.match(/\bPR\s*#?(\d+)\b/i) ??
    text.match(/pull\/(\d+)/i) ??
    text.match(/#(\d+)\b/);
  return m?.[1];
}

function normalizeContent(text: string): string {
  return text.replace(/^(?:@\S+\s*)+/, "").replace(/\s+/g, " ").trim();
}

export class IntentParser {
  private readonly sessionStore: SessionStore;

  constructor(config: { sessionStore: SessionStore }) {
    this.sessionStore = config.sessionStore;
  }

  async parse(raw: RawMessage): Promise<ParsedIntent> {
    const content = normalizeContent(raw.message.content);
    const lower = content.toLowerCase();
    const session = this.sessionStore.getOrCreate(raw.message.userId, raw.message.channelId);
    const history = session.messages;

    const parameters: Record<string, string> = {
      userId: raw.message.userId,
      channelId: raw.message.channelId,
      messageId: raw.message.messageId,
    };
    if (history.length > 0) {
      parameters.sessionTurns = String(history.length);
      const preview = history
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      parameters.sessionHistoryPreview = preview.slice(0, 4000);
    }

    const hasPr = /PR/i.test(content) || /review/i.test(content);
    if (hasPr) {
      const n = extractPrNumber(content);
      return {
        action: "review-pr",
        target: n,
        parameters: n ? { ...parameters, pr: n } : parameters,
        confidence: n ? 0.85 : 0.65,
        rawMessage: content,
      };
    }

    const addApi =
      /\badd\b/i.test(lower) &&
      (content.includes("API") || content.includes("api") || /\bendpoint\b/i.test(lower) || /\binterface\b/i.test(lower));
    if (addApi) {
      return {
        action: "add-code",
        parameters,
        confidence: 0.75,
        rawMessage: content,
      };
    }

    if (/\btest\b/i.test(lower)) {
      return {
        action: "run-tests",
        parameters,
        confidence: 0.72,
        rawMessage: content,
      };
    }

    if (/\brun\b/i.test(lower) || /\bexecute\b/i.test(lower)) {
      return {
        action: "run-command",
        parameters,
        confidence: 0.68,
        rawMessage: content,
      };
    }

    if (/\bexplain\b/i.test(lower)) {
      return {
        action: "explain-code",
        parameters,
        confidence: 0.7,
        rawMessage: content,
      };
    }

    if (/\bfix\b/i.test(lower) || /\bbug\b/i.test(lower)) {
      return {
        action: "fix-bug",
        parameters,
        confidence: 0.7,
        rawMessage: content,
      };
    }

    return {
      action: "unknown",
      parameters,
      confidence: 0.2,
      rawMessage: content,
    };
  }
}
