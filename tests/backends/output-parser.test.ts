import { describe, expect, it } from "vitest";
import {
  parseCodexOutput,
  parseClaudeOutput,
  parseBackendOutput,
} from "../../src/backends/output-parser.js";

describe("parseCodexOutput", () => {
  it("extracts the response block from full codex exec output", () => {
    const raw = `OpenAI Codex v0.116.0 (research preview)
--------
workdir: /home/user/my-project
model: gpt-5.4
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp]
reasoning effort: medium
reasoning summaries: none
session id: 019d283c-13f4-7750-9504-127f42c3caf2
--------
user
Respond directly to the user based on their message.

User message: hello, who are you

Parameters:
{
  "userId": "ou_69dc8d43433390fea7f10f58236996cd"
}

Repo: https://example.com/repo.git

Session history:
user: @_user_1 hello
assistant: Hi! How can I help you?
mcp startup: no servers
codex
I am an AI assistant. I can chat with you, answer questions, help you write code, edit copy, and brainstorm ideas.

Just tell me what you want to do.
tokens used
3,001`;

    const result = parseCodexOutput(raw);
    expect(result).toBe(
      "I am an AI assistant. I can chat with you, answer questions, help you write code, edit copy, and brainstorm ideas.\n\nJust tell me what you want to do.",
    );
  });

  it("returns raw content when no codex block markers found", () => {
    const raw = "Hello world";
    expect(parseCodexOutput(raw)).toBe("Hello world");
  });

  it("handles output with multiple codex blocks (picks last)", () => {
    const raw = `
codex
first response
tokens used
100
user
follow-up
codex
second response
tokens used
200`;

    expect(parseCodexOutput(raw)).toBe("second response");
  });

  it("extracts response when output contains preface text and CRLF newlines", () => {
    const raw =
      "I am Codex, your coding assistant.\r\n\r\n" +
      "OpenAI Codex v0.116.0 (research preview)\r\n" +
      "--------\r\n" +
      "workdir: /Users/example\r\n" +
      "model: gpt-5.4\r\n" +
      "--------\r\n" +
      "user\r\n" +
      "Respond directly to the user based on their message.\r\n\r\n" +
      "User message: who are you\r\n" +
      "mcp startup: no servers\r\n" +
      "codex\r\n" +
      "I am Codex, your coding assistant.\r\n\r\n" +
      "Send me a concrete task and I can help.\r\n" +
      "tokens used\r\n" +
      "2,958";

    expect(parseCodexOutput(raw)).toBe(
      "I am Codex, your coding assistant.\n\nSend me a concrete task and I can help.",
    );
  });
});

describe("parseClaudeOutput", () => {
  it("returns trimmed output as-is", () => {
    expect(parseClaudeOutput("  Hello, how can I help?\n")).toBe("Hello, how can I help?");
  });
});

describe("parseBackendOutput", () => {
  it("dispatches to correct parser by backend name", () => {
    expect(parseBackendOutput("claude-code", "  hi  ")).toBe("hi");
    expect(parseBackendOutput("cursor", "  result  ")).toBe("result");
    expect(parseBackendOutput("unknown-backend", "  raw  ")).toBe("raw");
  });
});
