export type TransportMode = "websocket" | "webhook";

export type TransportState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface TransportEvents {
  message: (msg: IncomingMessage) => void;
  stateChange: (state: TransportState) => void;
  error: (err: Error) => void;
}

export interface IMTransport {
  readonly mode: TransportMode;
  readonly state: TransportState;
  readonly platform: string;

  start(): Promise<void>;
  stop(): Promise<void>;

  on<E extends keyof TransportEvents>(
    event: E,
    handler: TransportEvents[E],
  ): void;
  off<E extends keyof TransportEvents>(
    event: E,
    handler: TransportEvents[E],
  ): void;
}

export interface SendMessageOptions {
  markdown?: boolean;
  threadId?: string;
  mentionUsers?: string[];
}

export interface StreamingCardSession {
  cardId: string;
  messageId: string;
  elementId: string;
  sequence: number;
}

export interface IMClient {
  readonly platform: string;

  sendMessage(
    channelId: string,
    content: string,
    options?: SendMessageOptions,
  ): Promise<{ messageId: string }>;

  updateMessage?(
    messageId: string,
    content: string,
    channelId: string,
  ): Promise<void>;

  sendCard?(
    channelId: string,
    card: Record<string, unknown>,
  ): Promise<{ messageId: string }>;

  createStreamingCard?(
    channelId: string,
    options?: { title?: string; threadId?: string; userId?: string },
  ): Promise<StreamingCardSession>;

  streamUpdateText?(
    session: StreamingCardSession,
    content: string,
  ): Promise<void>;

  closeStreamingMode?(session: StreamingCardSession): Promise<void>;
}

export interface PlatformConfig {
  platform: string;
  transportMode: TransportMode;
  credentials: Record<string, string>;
}

export interface IMPlatform {
  readonly name: string;
  readonly transport: IMTransport;
  readonly client: IMClient;

  initialize(config: PlatformConfig): Promise<void>;
  shutdown(): Promise<void>;
}

export interface IncomingMessage {
  platform: string;
  messageId: string;
  userId: string;
  userName?: string;
  channelId: string;
  channelName?: string;
  content: string;
  threadId?: string;
  timestamp: string;
  rawEvent: unknown;
}
