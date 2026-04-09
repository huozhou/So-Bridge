import { v4 as uuidv4 } from "uuid";
import type {
  ExecutionBackend,
  ExecutionResult,
  IntentAction,
  Task,
  TaskContext,
} from "../types.js";
import type { PathValidationResult } from "../whitelist/path-validator.js";

const MAX_USER_MESSAGE_LENGTH = 4000;
const MAX_PROMPT_LENGTH = 50_000;

function sanitizeUserInput(raw: string): string {
  let s = raw.slice(0, MAX_USER_MESSAGE_LENGTH);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return s.trim();
}

function buildPrompt(context: TaskContext): string {
  const { intent, repoUrl, branch, files, diff, sessionHistory, projectConfig } = context;
  const userMessage = sanitizeUserInput(intent.rawMessage);
  const lines: string[] =
    intent.action === "unknown"
      ? [
          "Respond directly to the user based on their message.",
          `User message: ${userMessage}`,
        ]
      : [`Action: ${intent.action}`, `User message: ${userMessage}`];
  if (intent.target) lines.push(`Target: ${intent.target}`);
  if (Object.keys(intent.parameters).length > 0) {
    lines.push(`Parameters:\n${JSON.stringify(intent.parameters, null, 2)}`);
  }
  if (repoUrl) lines.push(`Repo: ${repoUrl}`);
  if (branch) lines.push(`Branch: ${branch}`);
  if (files?.length) lines.push(`Files:\n${files.join("\n")}`);
  if (diff) lines.push(`Diff context:\n${diff}`);
  if (sessionHistory.length > 0) {
    lines.push(
      `Session history:\n${sessionHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
    );
  }
  if (projectConfig && Object.keys(projectConfig).length > 0) {
    lines.push(`Project config:\n${JSON.stringify(projectConfig)}`);
  }
  const prompt = lines.join("\n\n");
  return prompt.length > MAX_PROMPT_LENGTH
    ? prompt.slice(0, MAX_PROMPT_LENGTH) + "\n\n[truncated]"
    : prompt;
}

function requiresConfirmationForAction(action: IntentAction): boolean {
  return action === "add-code" || action === "fix-bug";
}

export class TaskDispatcher {
  private readonly backends: Map<string, ExecutionBackend>;
  private readonly defaultBackend: string;
  private readonly taskInstructions: string[];
  private readonly validateCommand?: (command: string) => PathValidationResult;

  constructor(config: {
    backends: Map<string, ExecutionBackend>;
    defaultBackend: string;
    taskInstructions?: string[];
    validateCommand?: (command: string) => PathValidationResult;
  }) {
    this.backends = config.backends;
    this.defaultBackend = config.defaultBackend;
    this.taskInstructions = config.taskInstructions ?? [];
    this.validateCommand = config.validateCommand;
  }

  getDefaultBackend(): string {
    return this.defaultBackend;
  }

  getBackend(name: string): ExecutionBackend {
    const backend = this.backends.get(name);
    if (!backend) {
      throw new Error(
        `Backend "${name}" is not registered. Available: ${[...this.backends.keys()].join(", ") || "(none)"}`,
      );
    }
    return backend;
  }

  private async resolveBackend(preferred: string): Promise<ExecutionBackend> {
    const primary = this.backends.get(preferred);
    if (!primary) {
      throw new Error(
        `Backend "${preferred}" is not registered. Available: ${[...this.backends.keys()].join(", ") || "(none)"}`,
      );
    }
    if (await primary.isAvailable()) {
      return primary;
    }
    throw new Error(
      `Backend "${preferred}" is configured but not available on this machine. ` +
        `Make sure the "${preferred}" CLI is installed and accessible in PATH.`,
    );
  }

  async dispatch(context: TaskContext): Promise<Task> {
    const backend = await this.resolveBackend(this.defaultBackend);
    return {
      taskId: uuidv4(),
      context,
      backend: backend.name,
      prompt: buildPrompt(context),
      instructions: this.taskInstructions,
      requiresConfirmation: requiresConfirmationForAction(context.intent.action),
    };
  }

  async dispatchAdhoc(
    context: TaskContext,
    prompt: string,
    backendType: string,
    requiresConfirmation: boolean,
  ): Promise<Task> {
    const backend = await this.resolveBackend(backendType);
    const sanitizedPrompt = sanitizeUserInput(prompt);
    if (this.validateCommand) {
      const result = this.validateCommand(sanitizedPrompt);
      if (!result.allowed) {
        throw new Error(`Whitelist validation failed: ${result.reason ?? "command rejected"}`);
      }
    }
    const execContext: TaskContext = {
      ...context,
      intent: { ...context.intent, action: "run-command", rawMessage: sanitizedPrompt },
    };
    return {
      taskId: uuidv4(),
      context: execContext,
      backend: backend.name,
      prompt: sanitizedPrompt,
      instructions: this.taskInstructions,
      requiresConfirmation,
    };
  }

  async execute(task: Task): Promise<ExecutionResult> {
    const backend = await this.resolveBackend(task.backend);
    return backend.execute(task);
  }
}
