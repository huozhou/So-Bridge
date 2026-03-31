/**
 * Extracts the meaningful response from CLI backend output.
 *
 * Codex `exec` outputs a full session transcript:
 *   OpenAI Codex v0.116.0 ...
 *   --------
 *   ... metadata ...
 *   --------
 *   user
 *   ... prompt ...
 *   codex
 *   ... ACTUAL RESPONSE ...
 *   tokens used
 *   N
 *
 * Claude `--print` outputs the response directly (no metadata wrapping).
 * Cursor `agent` behaviour TBD — treat like Claude for now.
 */

export function parseCodexOutput(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  let lastCodexLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "codex") lastCodexLine = i;
  }
  if (lastCodexLine !== -1) {
    let end = lines.length;
    for (let i = lastCodexLine + 1; i < lines.length; i++) {
      if (lines[i].trim().toLowerCase().startsWith("tokens used")) {
        end = i;
        break;
      }
    }
    const content = lines.slice(lastCodexLine + 1, end).join("\n").trim();
    if (content) return content;
  }

  const separatorIdx = normalized.lastIndexOf("--------\n");
  if (separatorIdx !== -1) {
    const afterSep = normalized.slice(separatorIdx + "--------\n".length);
    const cleaned = afterSep.replace(/\ntokens used\n\d[\d,]*\s*$/, "").trim();
    if (cleaned) return cleaned;
  }

  return normalized.trim();
}

export function parseClaudeOutput(raw: string): string {
  return raw.trim();
}

export function parseCursorOutput(raw: string): string {
  return raw.trim();
}

export function parseBackendOutput(
  backendName: string,
  raw: string,
): string {
  switch (backendName) {
    case "codex-cli":
      return parseCodexOutput(raw);
    case "claude-code":
      return parseClaudeOutput(raw);
    case "cursor":
      return parseCursorOutput(raw);
    default:
      return raw.trim();
  }
}
