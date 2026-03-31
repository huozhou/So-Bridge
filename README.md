# so-bridge

Turn your IM into an AI-powered coding assistant — no cloud deployment needed.

`so-bridge` is a local bridge that connects your IM bot to an AI coding assistant. Send a message in Slack or Lark, and your AI assistant gets to work. Results stream back in real-time.

```
You (in Slack/Lark)          so-bridge           AI Assistant
                          ┌────────────┐
 "Review PR #42"    ───▶  │  Local     │  ───▶  Codex CLI
 "Run the tests"          │  Bridge    │        Claude Code
 "Add a billing API"      │  Service   │        Cursor
                          └────────────┘        ...
                                │
                                ▼
                      Browser Admin Console
                   http://127.0.0.1:3000/admin
```

## Why so-bridge?

- **Runs locally** — no cloud server, no public URL, no ngrok. Your bot connects to Slack/Lark via WebSocket.
- **Stream responses** — AI output appears in real-time, just like ChatGPT. No waiting for the full answer.
- **Multiple AI assistants** — Codex CLI, Claude Code, Cursor, and more. Switch between them in seconds.
- **Browser admin console** — configure everything from a clean web UI. No config files to edit manually.
- **Project safety** — whitelist which directories the AI can access. Keep your production code safe.

## Quick Start

```bash
npm install
npm run build
npm start
```

Open [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin) in your browser.

That's it. The admin console walks you through the rest:

1. **Add a Bot Connection** — paste your Slack or Lark tokens
2. **Add an AI Assistant** — pick Codex CLI, Claude Code, or Cursor
3. **Create a Bridge Profile** — link the bot to the assistant
4. **Activate** — flip the switch and start chatting

## Connect Slack

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable **Socket Mode** in Settings
3. Generate an **App-Level Token** (`xapp-...`) with `connections:write` scope
4. Add **Bot Token Scopes**: `chat:write`, `im:read`
5. Subscribe to **Events**: `message.im`, `app_mention`
6. Install the app to your workspace — copy the **Bot Token** (`xoxb-...`)
7. Paste both tokens in the admin console

## Connect Lark (Feishu)

1. Create a Self-built App at [open.feishu.cn/app](https://open.feishu.cn/app)
2. Add **Permissions**: `im:message`, `im:message:send_as_bot`
3. Subscribe to **Events**: `im.message.receive_v1`
4. Enable **WebSocket** mode for event subscriptions
5. Copy your **App ID** and **App Secret**
6. Paste them in the admin console

## AI Assistants

| Assistant | CLI Tool | How to install |
| --- | --- | --- |
| Codex CLI | `codex` | [github.com/openai/codex](https://github.com/openai/codex) |
| Claude Code | `claude` | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) |
| Cursor | `cursor` | [cursor.com](https://cursor.com/) |

Install any of these CLI tools, and `so-bridge` will detect them automatically.

## CLI Commands

```bash
so-bridge start     # Start the bridge service
so-bridge status    # Show active profile and config paths
so-bridge open      # Open admin console in browser
so-bridge purge     # Remove all local config and state
```

For development, use the npm scripts:

```bash
npm start           # Start (after npm run build)
npm run dev         # Start with auto-reload
npm test            # Run tests
```

## Streaming

Both platforms support real-time streaming output:

- **Slack** — native streaming API. Responses appear as a thread reply, updating in real-time.
- **Lark** — CardKit streaming. An interactive card updates live as the AI generates output.

Streaming is automatic when your AI assistant supports it.

## How It Works

`so-bridge` runs on your machine and manages one active bridge:

```
Bot Connection  ──▶  so-bridge  ──▶  AI Assistant
```

All configuration is stored locally in your user data directory:

| OS | Path |
| --- | --- |
| macOS | `~/Library/Application Support/so-bridge/` |
| Linux | `~/.config/so-bridge/` |
| Windows | `%AppData%\so-bridge\` |

The admin console at `http://127.0.0.1:3000/admin` lets you manage:

- **Bot Connections** — your Slack/Lark bot tokens
- **AI Assistants** — which coding tools to use
- **Bridge Profiles** — combinations of bot + assistant
- **Project Whitelist** — directories the AI is allowed to access

## Health Check

```bash
curl http://127.0.0.1:3000/health
```

## License

Private.
