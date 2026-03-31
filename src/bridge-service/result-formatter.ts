import type {
  ExecutionResult,
  FormattedResult,
  PendingAction,
  Task,
} from "../types.js";
import { v4 as uuidv4 } from "uuid";

function parseTestCounts(stdout: string): { passed?: number; failed?: number } {
  let passed: number | undefined;
  let failed: number | undefined;
  const p1 = stdout.match(/(\d+)\s+passed/i);
  const f1 = stdout.match(/(\d+)\s+failed/i);
  if (p1) passed = Number(p1[1]);
  if (f1) failed = Number(f1[1]);
  const pf = stdout.match(/Tests?:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?/i);
  if (pf) {
    passed = Number(pf[1]);
    if (pf[2]) failed = Number(pf[2]);
  }
  return { passed, failed };
}

const DANGEROUS_PATTERNS: { re: RegExp; description: string; risk: PendingAction["risk"] }[] = [
  { re: /\bgit\s+push\b/i, description: "git push (remote write)", risk: "high" },
  { re: /\bgit\s+merge\b/i, description: "git merge (repo mutation)", risk: "high" },
  { re: /\brm\s+(-[rf]+\s+)?/i, description: "rm (destructive filesystem)", risk: "high" },
  { re: /\brmdir\b/i, description: "rmdir (filesystem)", risk: "medium" },
];

function extractPendingActions(text: string): PendingAction[] {
  const hay = text;
  const seen = new Set<string>();
  const out: PendingAction[] = [];
  for (const { re, description, risk } of DANGEROUS_PATTERNS) {
    const m = hay.match(re);
    if (!m) continue;
    const command = m[0].trim();
    if (seen.has(command)) continue;
    seen.add(command);
    out.push({
      actionId: uuidv4(),
      description,
      command,
      risk,
    });
  }
  return out;
}

export class ResultFormatter {
  format(result: ExecutionResult, task: Task): FormattedResult {
    const action = task.context.intent.action;
    const combined = `${result.stdout}\n${result.stderr}`;

    let markdown = "";
    let summary = "";

    switch (action) {
      case "review-pr": {
        const diff = result.diff ?? "<!-- no diff attached -->";
        markdown = `## PR Review\n\n${diff}\n\n### Notes\n${result.stdout || "_No additional stdout._"}\n`;
        summary = "PR review summary generated.";
        break;
      }
      case "run-tests": {
        const { passed, failed } = parseTestCounts(result.stdout);
        const p = passed ?? "—";
        const f = failed ?? "—";
        markdown = `## Test Results\n\n- **Passed:** ${p}\n- **Failed:** ${f}\n\n\`\`\`\n${result.stdout}\n\`\`\`\n`;
        summary =
          typeof passed === "number" || typeof failed === "number"
            ? `Tests: ${passed ?? 0} passed, ${failed ?? 0} failed.`
            : "Test run finished.";
        break;
      }
      case "add-code":
      case "fix-bug": {
        const diffBlock = (result.diff ?? result.stdout) || "_No diff output._";
        markdown = `## Code Changes\n\n\`\`\`diff\n${diffBlock}\n\`\`\`\n`;
        summary = "Code change proposal ready.";
        break;
      }
      case "run-command": {
        markdown = `## Command Output\n\n**stdout**\n\`\`\`\n${result.stdout}\n\`\`\`\n\n**stderr**\n\`\`\`\n${result.stderr}\n\`\`\`\n`;
        summary = result.exitCode === 0 ? "Command completed." : `Command exited with ${result.exitCode}.`;
        break;
      }
      default: {
        const content = result.stdout.trim() || result.stderr.trim() || "_No output._";
        markdown = content;
        summary = content.split("\n")[0] || "Task completed.";
      }
    }

    const pendingFromOutput = extractPendingActions(combined + (result.diff ?? ""));
    const requiresConfirmation = task.requiresConfirmation || pendingFromOutput.length > 0;

    return {
      taskId: result.taskId,
      markdown,
      summary,
      requiresConfirmation,
      pendingActions: pendingFromOutput.length > 0 ? pendingFromOutput : undefined,
    };
  }
}
