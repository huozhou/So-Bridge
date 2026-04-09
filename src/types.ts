// ---------------------------------------------------------------------------
// Edge: im-client -> im-bot  (data-flow: "send message")
// ---------------------------------------------------------------------------

export interface IMMessage {
  messageId: string;
  userId: string;
  channelId: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  platform?: string;
}

// ---------------------------------------------------------------------------
// Edge: message-receiver -> intent-parser  (data-flow: "raw message")
// ---------------------------------------------------------------------------

export interface RawMessage {
  message: IMMessage;
  receivedAt: string;
  source: "http" | "websocket";
}

// ---------------------------------------------------------------------------
// Edge: intent-parser -> context-loader  (data-flow: "structured task")
// ---------------------------------------------------------------------------

export type IntentAction =
  | "review-pr"
  | "add-code"
  | "run-tests"
  | "run-command"
  | "explain-code"
  | "fix-bug"
  | "unknown";

export interface ParsedIntent {
  action: IntentAction;
  target?: string;
  parameters: Record<string, string>;
  confidence: number;
  rawMessage: string;
}

// ---------------------------------------------------------------------------
// Edge: context-loader -> task-dispatcher  (data-flow: "task with context")
// ---------------------------------------------------------------------------

export interface TaskContext {
  intent: ParsedIntent;
  repoUrl?: string;
  branch?: string;
  files?: string[];
  diff?: string;
  projectConfig?: Record<string, unknown>;
  sessionHistory: SessionMessage[];
}

// ---------------------------------------------------------------------------
// Edge: bridge-service -> backends  (data-flow: "dispatch task")
// ---------------------------------------------------------------------------

export type BackendType = string;

export const KNOWN_BACKENDS = {
  CODEX_CLI: "codex-cli",
  CLAUDE_CODE: "claude-code",
  CURSOR: "cursor",
  VSCODE_AGENT: "vscode-agent",
  CLOUD_SANDBOX: "cloud-sandbox",
} as const;

export interface Task {
  taskId: string;
  context: TaskContext;
  backend: BackendType;
  prompt: string;
  instructions?: string[];
  requiresConfirmation: boolean;
}

// ---------------------------------------------------------------------------
// Edge: backends -> bridge-service  (reference: "return execution result")
// Edge: task-dispatcher -> result-collector  (data-flow: "execution result stream")
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  taskId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  diff?: string;
  filesChanged?: string[];
  duration: number;
}

// ---------------------------------------------------------------------------
// Edge: result-collector -> result-formatter  (data-flow: "raw result")
// Edge: bridge-service -> im-bot  (reference: "send back result")
// ---------------------------------------------------------------------------

export interface FormattedResult {
  taskId: string;
  markdown: string;
  summary: string;
  requiresConfirmation: boolean;
  pendingActions?: PendingAction[];
}

// ---------------------------------------------------------------------------
// Edge: result-formatter -> confirm-handler  (data-flow: "actions needing confirmation")
// ---------------------------------------------------------------------------

export interface PendingAction {
  actionId: string;
  description: string;
  command: string;
  risk: "low" | "medium" | "high";
}

export interface ConfirmationRequest {
  taskId: string;
  userId: string;
  channelId: string;
  actions: PendingAction[];
  expiresAt: string;
}

export interface ConfirmationResponse {
  taskId: string;
  approved: boolean;
  approvedActions: string[];
}

// ---------------------------------------------------------------------------
// Edge: intent-parser <-> session-store  (data-flow / reference)
// ---------------------------------------------------------------------------

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  channelId: string;
  messages: SessionMessage[];
  currentTask?: Task;
  pendingConfirmation?: ConfirmationRequest;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Streaming chunks emitted by backends during execution
// ---------------------------------------------------------------------------

export interface StreamChunk {
  type: "stdout" | "stderr" | "status";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Backend interface  (shared by codex-cli, vscode-agent, cloud-sandbox)
// ---------------------------------------------------------------------------

export interface ExecutionBackend {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  execute(task: Task): Promise<ExecutionResult>;
  executeStream?(task: Task): AsyncIterable<StreamChunk>;
  cancel(taskId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Bridge pipeline  (composite node public API)
// ---------------------------------------------------------------------------

export interface StreamingOptions {
  sendInitial: (text: string) => Promise<string>;
  updateMessage: (messageId: string, text: string) => Promise<void>;
  /** Called after streaming completes to finalize (e.g. close Lark card streaming mode). */
  finalize?: () => Promise<void>;
}

export interface BridgePipeline {
  handleMessage(
    message: IMMessage,
    streaming?: StreamingOptions,
  ): Promise<FormattedResult>;
  handleConfirmation(response: ConfirmationResponse): Promise<FormattedResult>;
}
