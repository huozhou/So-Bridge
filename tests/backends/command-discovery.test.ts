import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => {
  const mockExec = vi.fn();
  return { exec: mockExec };
});

vi.mock("node:util", () => ({
  promisify: (fn: unknown) => fn,
}));

describe("isCommandAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a portable lookup command", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockResolvedValueOnce({ stdout: "/usr/local/bin/codex" });

    const { isCommandAvailable } = await import("../../src/backends/command-discovery.js");
    const result = await isCommandAvailable("codex");

    expect(result).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(expect.stringMatching(/command -v codex|where codex/));
  });

  it("returns false when lookup fails", async () => {
    const { exec } = await import("node:child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockRejectedValueOnce(new Error("not found"));

    const { isCommandAvailable } = await import("../../src/backends/command-discovery.js");
    const result = await isCommandAvailable("claude");

    expect(result).toBe(false);
  });
});
