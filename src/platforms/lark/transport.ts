import * as Lark from "@larksuiteoapi/node-sdk";
import type {
  IMTransport,
  IncomingMessage,
  TransportEvents,
  TransportMode,
  TransportState,
} from "../types.js";
import { parseLarkEvent } from "./message-adapter.js";

type EventName = keyof TransportEvents;
type HandlerFn = TransportEvents[EventName];

export class LarkWSTransport implements IMTransport {
  readonly mode: TransportMode = "websocket";
  readonly platform: string;

  private _state: TransportState = "disconnected";
  private readonly handlers = new Map<EventName, Set<HandlerFn>>();
  private readonly appId: string;
  private readonly appSecret: string;
  private wsClient: Lark.WSClient | null = null;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectIntervalMs: number;

  constructor(config: {
    appId: string;
    appSecret: string;
    platform?: string;
    maxReconnectAttempts?: number;
    reconnectIntervalMs?: number;
  }) {
    this.platform = config.platform ?? "lark";
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    this.reconnectIntervalMs = config.reconnectIntervalMs ?? 10_000;
  }

  get state(): TransportState {
    return this._state;
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.reconnectAttempts = 0;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.clearTimers();
    this.wsClient = null;
    this.setState("disconnected");
  }

  on<E extends EventName>(event: E, handler: TransportEvents[E]): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as HandlerFn);
  }

  off<E extends EventName>(event: E, handler: TransportEvents[E]): void {
    this.handlers.get(event)?.delete(handler as HandlerFn);
  }

  private async connect(): Promise<void> {
    this.setState("connecting");

    const eventDispatcher = new Lark.EventDispatcher({}).register({
      "im.message.receive_v1": async (data) => {
        const event = {
          header: { event_id: "", event_type: "im.message.receive_v1" },
          event: data,
        };
        const msg = parseLarkEvent(event);
        if (msg) {
          this.emit("message", msg);
        }
      },
    });

    this.wsClient = new Lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      loggerLevel: Lark.LoggerLevel.error,
    });

    try {
      await this.wsClient.start({ eventDispatcher });
      this.setState("connected");
      this.reconnectAttempts = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[${this.platform}] connection failed:`, error.message);
      this.wsClient = null;
      if (!this.stopped) {
        this.scheduleReconnect();
      } else {
        this.setState("disconnected");
        this.emit("error", error);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState("disconnected");
      this.emit(
        "error",
        new Error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached for ${this.platform}`),
      );
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;
    const delay = this.reconnectIntervalMs * this.reconnectAttempts;
    console.log(`[${this.platform}] reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(state: TransportState): void {
    if (this._state === state) return;
    this._state = state;
    this.emit("stateChange", state);
  }

  private emit<E extends EventName>(
    event: E,
    ...args: Parameters<TransportEvents[E]>
  ): void {
    const fns = this.handlers.get(event);
    if (!fns) return;
    for (const fn of fns) {
      (fn as (...a: unknown[]) => void)(...args);
    }
  }
}

export class LarkWebhookTransport implements IMTransport {
  readonly mode: TransportMode = "webhook";
  readonly platform = "lark";

  private _state: TransportState = "disconnected";
  private readonly handlers = new Map<string, Set<Function>>();

  get state(): TransportState {
    return this._state;
  }

  async start(): Promise<void> {
    this._state = "connected";
    this.emit("stateChange", "connected");
  }

  async stop(): Promise<void> {
    this._state = "disconnected";
    this.emit("stateChange", "disconnected");
  }

  handleWebhookRequest(body: unknown): void {
    const msg = parseLarkEvent(body);
    if (msg) {
      this.emit("message", msg);
    }
  }

  on<E extends keyof TransportEvents>(event: E, handler: TransportEvents[E]): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off<E extends keyof TransportEvents>(event: E, handler: TransportEvents[E]): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, ...args: unknown[]): void {
    const fns = this.handlers.get(event);
    if (!fns) return;
    for (const fn of fns) fn(...args);
  }
}
