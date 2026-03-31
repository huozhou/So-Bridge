import { describe, expect, it, vi, beforeEach } from "vitest";

const startMock = vi.fn();

vi.mock("@larksuiteoapi/node-sdk", () => {
  class EventDispatcher {
    register() {
      return this;
    }
  }

  class WSClient {
    start = startMock;
    constructor(_config: unknown) {}
  }

  return {
    EventDispatcher,
    WSClient,
    LoggerLevel: { error: "error", info: "info" },
  };
});

import { LarkWSTransport } from "../../src/platforms/lark/transport.js";

describe("LarkWSTransport", () => {
  beforeEach(() => {
    startMock.mockReset();
  });

  it("connects via SDK WSClient and sets state to connected", async () => {
    startMock.mockResolvedValueOnce(undefined);
    const transport = new LarkWSTransport({
      appId: "cli_a",
      appSecret: "sec_b",
    });

    const states: string[] = [];
    transport.on("stateChange", (s) => states.push(s));

    await transport.start();

    expect(transport.state).toBe("connected");
    expect(states).toContain("connecting");
    expect(states).toContain("connected");
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("schedules reconnect when SDK start fails", async () => {
    startMock.mockRejectedValueOnce(new Error("auth failed"));
    const transport = new LarkWSTransport({
      appId: "cli_a",
      appSecret: "sec_b",
      reconnectIntervalMs: 50,
      maxReconnectAttempts: 1,
    });

    const states: string[] = [];
    transport.on("stateChange", (s) => states.push(s));

    await transport.start();

    expect(transport.state).toBe("reconnecting");
    expect(states).toContain("connecting");
    expect(states).toContain("reconnecting");

    await transport.stop();
  });

  it("emits error after exhausting reconnect attempts", async () => {
    startMock.mockRejectedValue(new Error("auth failed"));
    const transport = new LarkWSTransport({
      appId: "cli_a",
      appSecret: "sec_b",
      reconnectIntervalMs: 10,
      maxReconnectAttempts: 1,
    });

    const errors: string[] = [];
    transport.on("error", (err) => errors.push(err.message));

    await transport.start();
    // wait for the single reconnect attempt to fire and fail
    await new Promise((r) => setTimeout(r, 100));

    expect(transport.state).toBe("disconnected");
    expect(errors.some((m) => m.includes("Max reconnect attempts"))).toBe(true);
  });

  it("stops cleanly and prevents further reconnects", async () => {
    startMock.mockRejectedValue(new Error("network"));
    const transport = new LarkWSTransport({
      appId: "cli_a",
      appSecret: "sec_b",
      reconnectIntervalMs: 50,
      maxReconnectAttempts: 5,
    });

    await transport.start();
    await transport.stop();

    expect(transport.state).toBe("disconnected");
    // wait to confirm no further reconnects fire
    await new Promise((r) => setTimeout(r, 150));
    expect(transport.state).toBe("disconnected");
  });

  it("initial state is disconnected and mode is websocket", () => {
    const transport = new LarkWSTransport({
      appId: "cli_a",
      appSecret: "sec_b",
    });
    expect(transport.state).toBe("disconnected");
    expect(transport.mode).toBe("websocket");
    expect(transport.platform).toBe("lark");
  });
});
