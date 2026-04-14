import { spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";

import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";
import { isCommandAvailable } from "./command-discovery.js";
import { composeTaskPrompt } from "./prompt-utils.js";
import { mergeChildStreams, collectStream } from "./stream-utils.js";

export class CodexCliBackend implements ExecutionBackend {
  readonly name = "codex-cli" as const;

  private readonly processes = new Map<string, ChildProcess>();
  private readonly cwd: string;
  private readonly skipGitRepoCheck: boolean;

  constructor(options?: { cwd?: string; skipGitRepoCheck?: boolean }) {
    this.cwd = options?.cwd || homedir();
    this.skipGitRepoCheck = options?.skipGitRepoCheck ?? true;
  }

  async isAvailable(): Promise<boolean> {
    return isCommandAvailable("codex");
  }

  execute(task: Task): Promise<ExecutionResult> {
    return collectStream(this.executeStream(task), task.taskId, this.name);
  }

  async *executeStream(task: Task): AsyncIterable<StreamChunk> {
    yield { type: "status", content: "Codex is thinking...", timestamp: Date.now() };

    const args = ["exec", "--full-auto"];
    if (this.skipGitRepoCheck) {
      args.push("--skip-git-repo-check");
    }
    args.push(composeTaskPrompt(task));

    const child = spawn("codex", args, {
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
