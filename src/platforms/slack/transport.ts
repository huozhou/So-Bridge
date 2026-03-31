import type WebSocket from "ws";
import { BaseWSTransport, type WSTransportConfig } from "../base-ws-transport.js";
import type {
  IMTransport,
  IncomingMessage,
  TransportEvents,
  TransportMode,
  TransportState,
} from "../types.js";
import { getEnvelopeId, parseSlackEvent } from "./message-adapter.js";

export class SlackSocketTransport extends BaseWSTransport {
  private readonly appToken: string;

  constructor(config: WSTransportConfig & { appToken: string }) {
    super(config);
    this.appToken = config.appToken;
  }

  async buildConnectionUrl(): Promise<string> {
    const resp = await fetch("https://slack.com/api/apps.connections.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${this.appToken}`,
      },
    });

    const data = (await resp.json()) as { ok: boolean; url?: string; error?: string };
    if (!data.ok || !data.url) {
      throw new Error(`Slack connections.open failed: ${data.error ?? "no url"}`);
    }

    return data.url;
  }

  parseMessage(data: string): IncomingMessage | null {
    try {
      const parsed = JSON.parse(data);
      const envelopeId = getEnvelopeId(parsed);
      if (envelopeId && this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({ envelope_id: envelopeId }));
      }
      return parseSlackEvent(parsed);
    } catch {
      return null;
    }
  }

  sendHeartbeat(ws: WebSocket): void {
    ws.ping();
  }
}

export class SlackWebhookTransport implements IMTransport {
  readonly mode: TransportMode = "webhook";
  readonly platform = "slack";

  private _state: TransportState = "disconnected";
  private readonly handlers = new Map<string, Set<Function>>();

  constructor(_config?: { signingSecret?: string }) {}

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
    const msg = parseSlackEvent(body);
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
