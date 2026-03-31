import WebSocket from "ws";
import type {
  IMTransport,
  IncomingMessage,
  TransportEvents,
  TransportMode,
  TransportState,
} from "./types.js";

export interface WSTransportConfig {
  platform: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
}

type EventName = keyof TransportEvents;
type HandlerFn = TransportEvents[EventName];

export abstract class BaseWSTransport implements IMTransport {
  readonly mode: TransportMode = "websocket";
  readonly platform: string;

  private _state: TransportState = "disconnected";
  protected ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  private readonly reconnectIntervalMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly heartbeatIntervalMs: number;

  private readonly handlers: Map<EventName, Set<HandlerFn>> = new Map();

  constructor(config: WSTransportConfig) {
    this.platform = config.platform;
    this.reconnectIntervalMs = config.reconnectIntervalMs ?? 5000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 10;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? 30_000;
  }

  get state(): TransportState {
    return this._state;
  }

  abstract buildConnectionUrl(): Promise<string>;
  abstract parseMessage(data: string): IncomingMessage | null;
  abstract sendHeartbeat(ws: WebSocket): void;

  on<E extends EventName>(event: E, handler: TransportEvents[E]): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as HandlerFn);
  }

  off<E extends EventName>(event: E, handler: TransportEvents[E]): void {
    this.handlers.get(event)?.delete(handler as HandlerFn);
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.reconnectAttempts = 0;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close(1000, "transport stopped");
      }
      this.ws = null;
    }
    this.setState("disconnected");
  }

  private async connect(): Promise<void> {
    this.setState("connecting");

    try {
      const url = await this.buildConnectionUrl();
      const ws = new WebSocket(url);

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          ws.removeListener("error", onError);
          resolve();
        };
        const onError = (err: Error) => {
          ws.removeListener("open", onOpen);
          reject(err);
        };
        ws.once("open", onOpen);
        ws.once("error", onError);
      });

      this.ws = ws;
      this.reconnectAttempts = 0;
      this.setState("connected");
      this.startHeartbeat();

      ws.on("message", (data) => {
        const str = typeof data === "string" ? data : data.toString("utf8");
        const msg = this.parseMessage(str);
        if (msg) {
          this.reconnectAttempts = 0;
          this.emit("message", msg);
        }
      });

      ws.on("close", () => {
        this.clearTimers();
        if (!this.stopped) {
          this.scheduleReconnect();
        }
      });

      ws.on("error", (err) => {
        this.emit("error", err);
      });
    } catch (err) {
      console.error(`[${this.platform}] connection failed:`, err);
      if (!this.stopped) {
        this.scheduleReconnect();
      } else {
        this.setState("disconnected");
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState("disconnected");
      this.emit("error", new Error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached for ${this.platform}`,
      ));
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, this.reconnectIntervalMs);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendHeartbeat(this.ws);
      }
    }, this.heartbeatIntervalMs);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
