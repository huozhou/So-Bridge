import { describe, it, expect, vi } from "vitest";
import { PlatformManager } from "../../src/platforms/manager.js";
import type {
  IMPlatform,
  IMTransport,
  IMClient,
  TransportState,
} from "../../src/platforms/types.js";

function createMockTransport(platform: string): IMTransport {
  return {
    mode: "websocket",
    state: "disconnected" as TransportState,
    platform,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function createMockClient(platform: string): IMClient {
  return {
    platform,
    sendMessage: vi.fn().mockResolvedValue({ messageId: "sent-1" }),
  };
}

function createMockPlatform(name: string): IMPlatform {
  return {
    name,
    transport: createMockTransport(name),
    client: createMockClient(name),
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PlatformManager", () => {
  it("registers and retrieves a platform client", () => {
    const manager = new PlatformManager();
    const platform = createMockPlatform("slack");
    manager.register(platform);

    const client = manager.getClient("slack");
    expect(client).toBeDefined();
    expect(client?.platform).toBe("slack");
  });

  it("returns undefined for unregistered platform", () => {
    const manager = new PlatformManager();
    expect(manager.getClient("unknown")).toBeUndefined();
  });

  it("startAll starts all registered platform transports", async () => {
    const manager = new PlatformManager();
    const slack = createMockPlatform("slack");
    const lark = createMockPlatform("lark");
    manager.register(slack);
    manager.register(lark);

    await manager.startAll();

    expect(slack.transport.start).toHaveBeenCalled();
    expect(lark.transport.start).toHaveBeenCalled();
  });

  it("stopAll shuts down all platforms", async () => {
    const manager = new PlatformManager();
    const slack = createMockPlatform("slack");
    manager.register(slack);

    await manager.startAll();
    await manager.stopAll();

    expect(slack.shutdown).toHaveBeenCalled();
  });

  it("getPlatforms returns all registered platforms", () => {
    const manager = new PlatformManager();
    manager.register(createMockPlatform("slack"));
    manager.register(createMockPlatform("lark"));

    const platforms = manager.getPlatforms();
    expect(platforms).toHaveLength(2);
    expect(platforms.map((p) => p.name)).toContain("slack");
    expect(platforms.map((p) => p.name)).toContain("lark");
  });
});
