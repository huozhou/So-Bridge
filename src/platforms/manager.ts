import type { BridgeConfigFile } from "../config/types.js";
import { LarkClient } from "./lark/client.js";
import { LarkWebhookTransport, LarkWSTransport } from "./lark/transport.js";
import { SlackClient } from "./slack/client.js";
import { SlackSocketTransport, SlackWebhookTransport } from "./slack/transport.js";
import type { IMClient, IMPlatform } from "./types.js";

export class PlatformManager {
  private readonly platforms = new Map<string, IMPlatform>();

  register(platform: IMPlatform): void {
    this.platforms.set(platform.name, platform);
  }

  async startAll(): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.platforms.values()).map(async (p) => {
        await p.transport.start();
        console.log(`[PlatformManager] ${p.name} transport started (${p.transport.mode})`);
      }),
    );

    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[PlatformManager] failed to start platform:", r.reason);
      }
    }
  }

  async stopAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.platforms.values()).map((p) => p.shutdown()),
    );
  }

  getClient(platform: string): IMClient | undefined {
    return this.platforms.get(platform)?.client;
  }

  getPlatform(platform: string): IMPlatform | undefined {
    return this.platforms.get(platform);
  }

  getPlatforms(): IMPlatform[] {
    return Array.from(this.platforms.values());
  }
}

export function createPlatformManager(config: BridgeConfigFile): PlatformManager {
  const manager = new PlatformManager();
  const platformMode = config.platforms.mode;

  if (config.platforms.slack.enabled && config.platforms.slack.botToken) {
    const slackClient = new SlackClient({ botToken: config.platforms.slack.botToken });
    const slackTransport =
      platformMode === "websocket" && config.platforms.slack.appToken
        ? new SlackSocketTransport({
            platform: "slack",
            appToken: config.platforms.slack.appToken,
          })
        : new SlackWebhookTransport({
            signingSecret: config.platforms.slack.signingSecret,
          });
    const slackPlatform: IMPlatform = {
      name: "slack",
      transport: slackTransport,
      client: slackClient,
      initialize: async () => {},
      shutdown: async () => {
        await slackTransport.stop();
      },
    };
    manager.register(slackPlatform);
  }

  if (
    config.platforms.lark.enabled &&
    config.platforms.lark.appId &&
    config.platforms.lark.appSecret
  ) {
    const larkClient = new LarkClient({
      appId: config.platforms.lark.appId,
      appSecret: config.platforms.lark.appSecret,
    });
    const larkTransport =
      platformMode === "websocket"
        ? new LarkWSTransport({
            platform: "lark",
            appId: config.platforms.lark.appId,
            appSecret: config.platforms.lark.appSecret,
          })
        : new LarkWebhookTransport();
    const larkPlatform: IMPlatform = {
      name: "lark",
      transport: larkTransport,
      client: larkClient,
      initialize: async () => {},
      shutdown: async () => {
        await larkTransport.stop();
      },
    };
    manager.register(larkPlatform);
  }

  return manager;
}
