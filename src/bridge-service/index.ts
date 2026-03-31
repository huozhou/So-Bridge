import type {
  BridgePipeline,
  ConfirmationResponse,
  ExecutionBackend,
  FormattedResult,
  IMMessage,
  StreamingOptions,
  TaskContext,
} from "../types.js";
import { ConfirmHandler } from "./confirm-handler.js";
import { ContextLoader } from "./context-loader.js";
import { IntentParser } from "./intent-parser.js";
import { MessageReceiver } from "./message-receiver.js";
import { ResultCollector } from "./result-collector.js";
import { ResultFormatter } from "./result-formatter.js";
import { SessionStore } from "./session-store.js";
import { StreamingExecutor } from "./streaming-executor.js";
import { TaskDispatcher } from "./task-dispatcher.js";

export interface BridgeConfig {
  port: number;
  authToken: string;
  backends: Map<string, ExecutionBackend>;
  defaultBackend: string;
}

export interface BridgeServiceComponents {
  messageReceiver: MessageReceiver;
  sessionStore: SessionStore;
  intentParser: IntentParser;
  contextLoader: ContextLoader;
  taskDispatcher: TaskDispatcher;
  resultCollector: ResultCollector;
  resultFormatter: ResultFormatter;
  confirmHandler: ConfirmHandler;
}

export class BridgeService implements BridgePipeline {
  private readonly messageReceiver: MessageReceiver;
  private readonly sessionStore: SessionStore;
  private readonly intentParser: IntentParser;
  private readonly contextLoader: ContextLoader;
  private readonly taskDispatcher: TaskDispatcher;
  private readonly resultCollector: ResultCollector;
  private readonly resultFormatter: ResultFormatter;
  private readonly confirmHandler: ConfirmHandler;
  private readonly streamingExecutor: StreamingExecutor;

  constructor(components: BridgeServiceComponents) {
    this.messageReceiver = components.messageReceiver;
    this.sessionStore = components.sessionStore;
    this.intentParser = components.intentParser;
    this.contextLoader = components.contextLoader;
    this.taskDispatcher = components.taskDispatcher;
    this.resultCollector = components.resultCollector;
    this.resultFormatter = components.resultFormatter;
    this.confirmHandler = components.confirmHandler;
    this.streamingExecutor = new StreamingExecutor();
  }

  async handleMessage(
    message: IMMessage,
    streaming?: StreamingOptions,
  ): Promise<FormattedResult> {
    const raw = this.messageReceiver.receive(message as unknown);
    const intent = await this.intentParser.parse(raw);
    const session = this.sessionStore.getOrCreate(raw.message.userId, raw.message.channelId);

    const context = await this.contextLoader.load(intent, session);

    const task = await this.taskDispatcher.dispatch(context);
    this.sessionStore.setCurrentTask(session.sessionId, task);

    const backend = this.taskDispatcher.getBackend(task.backend);
    const executionResult = await this.streamingExecutor.execute(
      task,
      backend,
      streaming,
    );
    const collected = this.resultCollector.collect(executionResult);
    const formatted = this.resultFormatter.format(collected, task);

    const ts = new Date().toISOString();
    this.sessionStore.addMessage(session.sessionId, {
      role: "user",
      content: raw.message.content,
      timestamp: ts,
    });
    this.sessionStore.addMessage(session.sessionId, {
      role: "assistant",
      content: formatted.summary,
      timestamp: new Date().toISOString(),
    });

    this.confirmHandler.createRequest(formatted, raw.message.userId, raw.message.channelId);

    return formatted;
  }

  async handleConfirmation(response: ConfirmationResponse): Promise<FormattedResult> {
    const sessionId = this.confirmHandler.peekSessionIdForTask(response.taskId);
    const { approved, actions } = this.confirmHandler.handleResponse(response);

    if (!approved || actions.length === 0) {
      return {
        taskId: response.taskId,
        markdown: "_Confirmation declined or expired._",
        summary: "No actions executed.",
        requiresConfirmation: false,
      };
    }

    const session = sessionId ? this.sessionStore.get(sessionId) : undefined;
    const baseContext: TaskContext =
      session?.currentTask?.context ?? {
        intent: {
          action: "run-command",
          parameters: {},
          confidence: 1,
          rawMessage: "",
        },
        sessionHistory: [...(session?.messages ?? [])],
      };

    let last: FormattedResult | undefined;
    for (const pa of actions) {
      const cmdTask = await this.taskDispatcher.dispatchAdhoc(
        baseContext,
        pa.command,
        this.taskDispatcher.getDefaultBackend(),
        false,
      );
      const exec = await this.taskDispatcher.execute(cmdTask);
      const collected = this.resultCollector.collect(exec);
      last = this.resultFormatter.format(collected, cmdTask);
    }

    return (
      last ?? {
        taskId: response.taskId,
        markdown: "_No command output._",
        summary: "Confirmation processed.",
        requiresConfirmation: false,
      }
    );
  }
}

export function createBridgeService(config: BridgeConfig): BridgeService {
  const sessionStore = new SessionStore();
  const messageReceiver = new MessageReceiver({
    port: config.port,
    authToken: config.authToken,
  });
  const intentParser = new IntentParser({ sessionStore });
  const contextLoader = new ContextLoader();
  const taskDispatcher = new TaskDispatcher({
    backends: config.backends,
    defaultBackend: config.defaultBackend,
  });
  const resultCollector = new ResultCollector();
  const resultFormatter = new ResultFormatter();
  const confirmHandler = new ConfirmHandler({ sessionStore });

  return new BridgeService({
    messageReceiver,
    sessionStore,
    intentParser,
    contextLoader,
    taskDispatcher,
    resultCollector,
    resultFormatter,
    confirmHandler,
  });
}

export { MessageReceiver } from "./message-receiver.js";
export { SessionStore } from "./session-store.js";
export { IntentParser } from "./intent-parser.js";
export { ContextLoader } from "./context-loader.js";
export { TaskDispatcher } from "./task-dispatcher.js";
export { ResultCollector } from "./result-collector.js";
export { ResultFormatter } from "./result-formatter.js";
export { ConfirmHandler } from "./confirm-handler.js";
export { StreamingExecutor } from "./streaming-executor.js";
