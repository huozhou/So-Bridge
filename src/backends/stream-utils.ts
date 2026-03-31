import type { ChildProcess } from "node:child_process";
import type { ExecutionResult, StreamChunk } from "../types.js";
import { parseBackendOutput } from "./output-parser.js";

export async function* mergeChildStreams(
  child: ChildProcess,
): AsyncIterable<StreamChunk> {
  const { stdout, stderr } = child;
  if (!stdout || !stderr) return;

  type QueueItem = StreamChunk | { done: true } | { error: Error };
  const queue: QueueItem[] = [];
  let resolve: (() => void) | null = null;

  const push = (item: QueueItem) => {
    queue.push(item);
    resolve?.();
  };

  let pending = 2;
  const onEnd = () => {
    if (--pending === 0) push({ done: true });
  };

  child.on("error", (err: Error) => push({ error: err }));

  stdout.on("data", (buf: Buffer) =>
    push({ type: "stdout", content: buf.toString(), timestamp: Date.now() }),
  );
  stderr.on("data", (buf: Buffer) =>
    push({ type: "stderr", content: buf.toString(), timestamp: Date.now() }),
  );
  stdout.on("end", onEnd);
  stderr.on("end", onEnd);

  while (true) {
    if (queue.length === 0) {
      await new Promise<void>((r) => {
        resolve = r;
      });
      resolve = null;
    }
    const item = queue.shift()!;
    if ("done" in item) break;
    if ("error" in item) throw item.error;
    yield item;
  }
}

export async function collectStream(
  stream: AsyncIterable<StreamChunk>,
  taskId: string,
  backendName?: string,
): Promise<ExecutionResult> {
  const start = Date.now();
  let stdout = "";
  let stderr = "";
  for await (const chunk of stream) {
    if (chunk.type === "stdout") stdout += chunk.content;
    else if (chunk.type === "stderr") stderr += chunk.content;
  }
  if (backendName) {
    stdout = parseBackendOutput(backendName, stdout);
  }
  return { taskId, exitCode: 0, stdout, stderr, duration: Date.now() - start };
}
