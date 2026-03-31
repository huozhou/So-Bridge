import type { ExecutionBackend, ExecutionResult, StreamChunk, Task } from "../types.js";

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 5 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class CloudSandboxBackend implements ExecutionBackend {
  readonly name = "cloud-sandbox" as const;

  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(options: { apiUrl: string; apiKey: string }) {
    this.apiUrl = options.apiUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  private authHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/health`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async execute(task: Task): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const createRes = await fetch(`${this.apiUrl}/tasks`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(task),
      });

      if (!createRes.ok) {
        const body = await createRes.text();
        return {
          taskId: task.taskId,
          exitCode: createRes.status,
          stdout: "",
          stderr: body || `Failed to create task: HTTP ${createRes.status}`,
          duration: Date.now() - start,
        };
      }

      const created = (await createRes.json()) as { taskId?: string };
      const remoteTaskId = created.taskId;
      if (!remoteTaskId) {
        return {
          taskId: task.taskId,
          exitCode: 1,
          stdout: "",
          stderr: "Create task response missing taskId",
          duration: Date.now() - start,
        };
      }

      const deadline = Date.now() + MAX_WAIT_MS;
      let status = "";

      while (Date.now() < deadline) {
        const statusRes = await fetch(
          `${this.apiUrl}/tasks/${remoteTaskId}/status`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${this.apiKey}` },
          },
        );

        if (!statusRes.ok) {
          return {
            taskId: task.taskId,
            exitCode: statusRes.status,
            stdout: "",
            stderr: await statusRes.text(),
            duration: Date.now() - start,
          };
        }

        const statusBody = (await statusRes.json()) as { status?: string };
        status = statusBody.status ?? "";

        if (status === "completed" || status === "failed") {
          break;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      if (status !== "completed" && status !== "failed") {
        return {
          taskId: task.taskId,
          exitCode: -1,
          stdout: "",
          stderr: "Cloud sandbox task timed out after 5 minutes",
          duration: Date.now() - start,
        };
      }

      const resultRes = await fetch(
        `${this.apiUrl}/tasks/${remoteTaskId}/result`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${this.apiKey}` },
        },
      );

      if (!resultRes.ok) {
        const body = await resultRes.text();
        return {
          taskId: task.taskId,
          exitCode: resultRes.status,
          stdout: "",
          stderr: body || `Failed to fetch result: HTTP ${resultRes.status}`,
          duration: Date.now() - start,
        };
      }

      const result = (await resultRes.json()) as ExecutionResult;
      return {
        ...result,
        taskId: result.taskId ?? task.taskId,
        duration: result.duration ?? Date.now() - start,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        taskId: task.taskId,
        exitCode: -1,
        stdout: "",
        stderr: message,
        duration: Date.now() - start,
      };
    }
  }

  async *executeStream(task: Task): AsyncIterable<StreamChunk> {
    yield { type: "status", content: "Cloud Sandbox starting...", timestamp: Date.now() };
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
      await fetch(`${this.apiUrl}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
    } catch {
      // best-effort cancel
    }
  }
}
