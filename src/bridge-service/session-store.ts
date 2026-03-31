import type {
  ConfirmationRequest,
  Session,
  SessionMessage,
  Task,
} from "../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  private sessionKey(userId: string, channelId: string): string {
    return `${userId}:${channelId}`;
  }

  getOrCreate(userId: string, channelId: string): Session {
    const sessionId = this.sessionKey(userId, channelId);
    let session = this.sessions.get(sessionId);
    if (!session) {
      const t = nowIso();
      session = {
        sessionId,
        userId,
        channelId,
        messages: [],
        createdAt: t,
        updatedAt: t,
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  addMessage(sessionId: string, msg: SessionMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.messages.push(msg);
    session.updatedAt = nowIso();
  }

  setCurrentTask(sessionId: string, task: Task): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.currentTask = task;
    session.updatedAt = nowIso();
  }

  setPendingConfirmation(sessionId: string, req: ConfirmationRequest): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.pendingConfirmation = req;
    session.updatedAt = nowIso();
  }

  clearPendingConfirmation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    delete session.pendingConfirmation;
    session.updatedAt = nowIso();
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
}
