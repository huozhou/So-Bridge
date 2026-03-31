import type {
  ConfirmationRequest,
  ConfirmationResponse,
  FormattedResult,
  PendingAction,
} from "../types.js";
import type { SessionStore } from "./session-store.js";

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export class ConfirmHandler {
  private readonly sessionStore: SessionStore;
  /** Maps confirmation taskId → sessionId for lookup (response only carries taskId). */
  private readonly taskIdToSessionId = new Map<string, string>();

  constructor(config: { sessionStore: SessionStore }) {
    this.sessionStore = config.sessionStore;
  }

  /** Resolve session id for a pending confirmation before {@link handleResponse} consumes it. */
  peekSessionIdForTask(taskId: string): string | undefined {
    return this.taskIdToSessionId.get(taskId);
  }

  createRequest(
    result: FormattedResult,
    userId: string,
    channelId: string,
  ): ConfirmationRequest | null {
    if (!result.requiresConfirmation) {
      return null;
    }
    const session = this.sessionStore.getOrCreate(userId, channelId);
    const actions = result.pendingActions ?? [];
    const req: ConfirmationRequest = {
      taskId: result.taskId,
      userId,
      channelId,
      actions,
      expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString(),
    };
    this.sessionStore.setPendingConfirmation(session.sessionId, req);
    this.taskIdToSessionId.set(result.taskId, session.sessionId);
    return req;
  }

  handleResponse(response: ConfirmationResponse): { approved: boolean; actions: PendingAction[] } {
    const sessionId = this.taskIdToSessionId.get(response.taskId);
    if (!sessionId) {
      return { approved: false, actions: [] };
    }
    const session = this.sessionStore.get(sessionId);
    const pending = session?.pendingConfirmation;
    if (!pending || pending.taskId !== response.taskId) {
      return { approved: false, actions: [] };
    }
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      this.sessionStore.clearPendingConfirmation(sessionId);
      this.taskIdToSessionId.delete(response.taskId);
      return { approved: false, actions: [] };
    }

    const approvedSet = new Set(response.approvedActions);
    let actions: PendingAction[] = [];
    if (response.approved) {
      actions =
        response.approvedActions.length > 0
          ? pending.actions.filter((a) => approvedSet.has(a.actionId))
          : pending.actions;
    }

    this.sessionStore.clearPendingConfirmation(sessionId);
    this.taskIdToSessionId.delete(response.taskId);

    return { approved: response.approved && actions.length > 0, actions };
  }
}
