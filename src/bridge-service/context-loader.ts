import type { ParsedIntent, Session, TaskContext } from "../types.js";

export class ContextLoader {
  async load(intent: ParsedIntent, session: Session): Promise<TaskContext> {
    const sessionHistory = [...session.messages];

    const base = (repoPlaceholder: string): TaskContext => ({
      intent,
      repoUrl: repoPlaceholder,
      sessionHistory,
    });

    switch (intent.action) {
      case "review-pr":
        return {
          intent,
          repoUrl: "https://example.com/repo.git",
          diff: "<!-- placeholder: PR diff -->",
          sessionHistory,
        };
      case "add-code":
        return {
          intent,
          repoUrl: "https://example.com/repo.git",
          files: ["src/api/new-endpoint.ts", "src/types.ts"],
          sessionHistory,
        };
      case "run-tests":
        return {
          intent,
          repoUrl: "https://example.com/repo.git",
          sessionHistory,
        };
      case "run-command":
      case "explain-code":
      case "fix-bug":
      case "unknown":
      default:
        return base("https://example.com/repo.git");
    }
  }
}
