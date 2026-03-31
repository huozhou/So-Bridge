import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseWSTransport } from "../../src/platforms/base-ws-transport.js";
import type { IncomingMessage } from "../../src/platforms/types.js";
import { WebSocketServer, type WebSocket as WSType } from "ws";

class TestWSTransport extends BaseWSTransport {
  testPort = 0;

  async buildConnectionUrl(): Promise<string> {
    return `ws://127.0.0.1:${this.testPort}`;
  }

  parseMessage(data: string): IncomingMessage | null {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === "heartbeat_ack") return null;
      return {
        platform: "test",
        messageId: parsed.id ?? "msg-1",
        userId: parsed.userId ?? "user-1",
        channelId: parsed.channelId ?? "ch-1",
        content: parsed.content ?? "",
        timestamp: new Date().toISOString(),
        rawEvent: parsed,
      };
    } catch {
      return null;
    }
  }

  sendHeartbeat(ws: WSType): void {
    ws.send(JSON.stringify({ type: "heartbeat" }));
  }
}

describe("BaseWSTransport", () => {
  let wss: WebSocketServer;
  let transport: TestWSTransport;
  let port: number;

  beforeEach(async () => {
    wss = new WebSocketServer({ port: 0 });
    const addr = wss.address();
    port = typeof addr === "object" ? addr.port : 0;

    transport = new TestWSTransport({
      platform: "test",
      reconnectIntervalMs: 200,
      maxReconnectAttempts: 3,
      heartbeatIntervalMs: 60_000,
    });
    transport.testPort = port;
  });

  afterEach(async () => {
    await transport.stop();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  it("connects and transitions to connected state", async () => {
    const states: string[] = [];
    transport.on("stateChange", (s) => states.push(s));

    await transport.start();

    expect(transport.state).toBe("connected");
    expect(states).toContain("connecting");
    expect(states).toContain("connected");
  });

  it("emits message event when server sends data", async () => {
    await transport.start();

    const msgPromise = new Promise<IncomingMessage>((resolve) => {
      transport.on("message", resolve);
    });

    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ content: "hello", id: "m1", userId: "u1", channelId: "c1" }));
    });

    const msg = await msgPromise;
    expect(msg.content).toBe("hello");
    expect(msg.platform).toBe("test");
  });

  it("mode is websocket", () => {
    expect(transport.mode).toBe("websocket");
  });

  it("initial state is disconnected", () => {
    expect(transport.state).toBe("disconnected");
  });

  it("stop transitions to disconnected", async () => {
    await transport.start();
    expect(transport.state).toBe("connected");
    await transport.stop();
    expect(transport.state).toBe("disconnected");
  });
});
