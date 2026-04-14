import { describe, expect, it } from "vitest";

import { createDefaultSoBridgeConfig } from "../../src/models/default-so-bridge-config.js";
import { buildActiveBridgeRuntime } from "../../src/runtime/app-runtime.js";
import { resolveActiveBridge } from "../../src/runtime/active-bridge.js";

describe("resolveActiveBridge", () => {
  it("carries the saved server port into the built runtime config", async () => {
    const config = createDefaultSoBridgeConfig();
    config.server.port = 4310;

    const active = resolveActiveBridge(config, null);
    const runtime = await buildActiveBridgeRuntime(active);

    expect(runtime.config.server.port).toBe(4310);
  });

  it("surfaces the selected whitelist path for restricted mode", () => {
    const config = createDefaultSoBridgeConfig();
    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a", "/repo/b"];
    config.directoryPolicy.selectedPath = "/repo/b";

    const active = resolveActiveBridge(config, null);

    expect(active.directoryPolicy.selectedPath).toBe("/repo/b");
  });

  it("rejects restricted mode when no selected path is available", async () => {
    const config = createDefaultSoBridgeConfig();
    config.directoryPolicy.mode = "restricted";
    config.directoryPolicy.allowedPaths = ["/repo/a"];
    config.directoryPolicy.selectedPath = null;

    const active = resolveActiveBridge(config, null);

    await expect(buildActiveBridgeRuntime(active)).rejects.toThrow(
      "Restricted mode requires a selected whitelist path",
    );
  });
});
