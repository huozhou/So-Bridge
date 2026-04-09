import type { Task } from "../types.js";

export function composeTaskPrompt(task: Pick<Task, "prompt" | "instructions">): string {
  if (!task.instructions || task.instructions.length === 0) {
    return task.prompt;
  }

  return `${task.instructions.join("\n\n")}\n\n${task.prompt}`;
}
