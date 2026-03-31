import { exec, spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";
import { mergeChildStreams, collectStream } from "./stream-utils.js";

const execAsync = promisify(exec);

export class ClaudeCodeBackend implements ExecutionBackend {
  readonly name = "claude-code" as const;

  private readonly processes = new Map<string, ChildProcess>();
  private readonly cwd: string;

  constructor(options?: { cwd?: string }) {
    this.cwd = options?.cwd || homedir();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync("which claude");
      return true;
    } catch {
      return false;
    }
  }

  execute(task: Task): Promise<ExecutionResult> {
    return collectStream(this.executeStream(task), task.taskId, this.name);
  }

  async *executeStream(task: Task): AsyncIterable<StreamChunk> {
    yield { type: "status", content: "Claude is thinking...", timestamp: Date.now() };

    const child = spawn("claude", ["--print", task.prompt], {
      cwd: this.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.processes.set(task.taskId, child);

    try {
      yield* mergeChildStreams(child);
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
