import { exec, spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";
import { composeTaskPrompt } from "./prompt-utils.js";
import { collectStream } from "./stream-utils.js";

const execAsync = promisify(exec);

const AGENT_BINARY_CANDIDATES = [
  join(homedir(), ".local", "bin", "agent"),
  "agent",
];

export class CursorBackend implements ExecutionBackend {
  readonly name = "cursor" as const;

  private readonly processes = new Map<string, ChildProcess>();
  private readonly cwd: string;
  private resolvedBinary: string | null = null;

  constructor(options?: { cwd?: string }) {
    this.cwd = options?.cwd || homedir();
  }

  private async findAgentBinary(): Promise<string | null> {
    for (const bin of AGENT_BINARY_CANDIDATES) {
      try {
        await execAsync(`"${bin}" --version`);
        return bin;
      } catch {}
    }
    return null;
  }

  async isAvailable(): Promise<boolean> {
    this.resolvedBinary = await this.findAgentBinary();
    return this.resolvedBinary !== null;
  }

  execute(task: Task): Promise<ExecutionResult> {
    return collectStream(this.executeStream(task), task.taskId, this.name);
  }

  async *executeStream(task: Task): AsyncIterable<StreamChunk> {
    yield { type: "status", content: "Cursor is thinking...", timestamp: Date.now() };

    if (!this.resolvedBinary) {
      this.resolvedBinary = await this.findAgentBinary();
    }
    if (!this.resolvedBinary) {
      yield { type: "stderr", content: "Cursor Agent CLI (agent) is not installed.", timestamp: Date.now() };
      return;
    }

    const args = [
      "-p",
      "--output-format", "stream-json",
      "--stream-partial-output",
      composeTaskPrompt(task),
    ];

    const child = spawn(this.resolvedBinary, args, {
      cwd: this.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.processes.set(task.taskId, child);

    try {
      yield* parseStreamJson(child);
    } finally {
      this.processes.delete(task.taskId);
    }
  }

  async cancel(taskId: string): Promise<void> {
    const proc = this.processes.get(taskId);
    if (!proc) return;
    proc.kill();
    this.processes.delete(taskId);
  }
}

async function* parseStreamJson(child: ChildProcess): AsyncIterable<StreamChunk> {
  const { stdout, stderr } = child;
  if (!stdout || !stderr) return;

  type QueueItem = StreamChunk | { done: true } | { error: Error };
  const queue: QueueItem[] = [];
  let resolve: (() => void) | null = null;

  const push = (item: QueueItem) => {
    queue.push(item);
    resolve?.();
  };

  let accumulatedText = "";

  const rl = createInterface({ input: stdout });
  rl.on("line", (line) => {
    try {
      const event = JSON.parse(line);
      const type = event.type;
      const subtype = event.subtype;

      if (type === "assistant") {
        const text = event.message?.content?.[0]?.text;
        if (typeof text === "string" && text.length > 0) {
          accumulatedText += text;
          push({ type: "stdout", content: accumulatedText, timestamp: Date.now() });
        }
      } else if (type === "tool_call" && subtype === "started") {
        const toolInfo = describeToolCall(event.tool_call);
        if (toolInfo) {
          push({ type: "status", content: toolInfo, timestamp: Date.now() });
        }
      } else if (type === "result") {
        if (!accumulatedText.trim() && event.result_text) {
          accumulatedText = event.result_text;
          push({ type: "stdout", content: accumulatedText, timestamp: Date.now() });
        }
      }
    } catch {}
  });
  rl.on("close", () => push({ done: true }));

  stderr.on("data", (buf: Buffer) => {
    push({ type: "stderr", content: buf.toString(), timestamp: Date.now() });
  });

  child.on("error", (err: Error) => push({ error: err }));

  while (true) {
    if (queue.length === 0) {
      await new Promise<void>((r) => { resolve = r; });
      resolve = null;
    }
    const item = queue.shift()!;
    if ("done" in item) break;
    if ("error" in item) throw item.error;
    yield item;
  }
}

function describeToolCall(toolCall: Record<string, unknown> | undefined): string | null {
  if (!toolCall) return null;
  if (toolCall.readToolCall) {
    const path = (toolCall.readToolCall as Record<string, unknown>).args
      ? ((toolCall.readToolCall as Record<string, { path?: string }>).args?.path ?? "")
      : "";
    return path ? `Reading ${path}...` : null;
  }
  if (toolCall.writeToolCall) {
    const path = (toolCall.writeToolCall as Record<string, unknown>).args
      ? ((toolCall.writeToolCall as Record<string, { path?: string }>).args?.path ?? "")
      : "";
    return path ? `Writing ${path}...` : null;
  }
  if (toolCall.commandToolCall) {
    return "Running command...";
  }
  return null;
}
