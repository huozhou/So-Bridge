import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";

export class VSCodeAgentBackend implements ExecutionBackend {
  readonly name = "vscode-agent" as const;

  private readonly endpoint: string;

  constructor(options: { endpoint?: string } = {}) {
    this.endpoint = options.endpoint ?? "http://localhost:23119";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/health`, { method: "GET" });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async execute(task: Task): Promise<ExecutionResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.endpoint}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.taskId,
          prompt: task.prompt,
          context: task.context,
        }),
      });

      const duration = Date.now() - start;
      const text = await res.text();

      if (!res.ok) {
        return {
          taskId: task.taskId,
          exitCode: res.status,
          stdout: "",
          stderr: text || `HTTP ${res.status}`,
          duration,
        };
      }

      let parsed: ExecutionResult;
      try {
        parsed = JSON.parse(text) as ExecutionResult;
      } catch {
        return {
          taskId: task.taskId,
          exitCode: 1,
          stdout: "",
          stderr: "Invalid JSON in execute response",
          duration,
        };
      }

      return { ...parsed, duration: parsed.duration ?? duration };
    } catch (e) {
      const duration = Date.now() - start;
      const message = e instanceof Error ? e.message : String(e);
      return {
        taskId: task.taskId,
        exitCode: -1,
        stdout: "",
        stderr: message,
        duration,
      };
    }
  }

  async *executeStream(task: Task): AsyncIterable<StreamChunk> {
    yield { type: "status", content: "VSCode Agent processing...", timestamp: Date.now() };
    const result = await this.execute(task);
    if (result.stdout) {
      yield { type: "stdout", content: result.stdout, timestamp: Date.now() };
    }
    if (result.stderr) {
      yield { type: "stderr", content: result.stderr, timestamp: Date.now() };
    }
  }

  async cancel(taskId: string): Promise<void> {
    try {
      await fetch(`${this.endpoint}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    } catch {
      // best-effort cancel
    }
  }
}
