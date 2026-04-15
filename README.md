# so-bridge

English | [简体中文](./README.zh-CN.md)

![CI](https://img.shields.io/github/actions/workflow/status/huozhou/So-Bridge/node.js.yml?branch=main&label=CI)
![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/github/license/huozhou/So-Bridge)
![GitHub release](https://img.shields.io/github/v/release/huozhou/So-Bridge)
<!-- ![GitHub stars](https://img.shields.io/github/stars/huozhou/So-Bridge?style=social) -->

Connect your IM directly to your AI coding assistant CLI.

`so-bridge` turns Slack or Lark into a live window into your AI coding workflow. You can start work from chat, receive progress updates without staring at a terminal, and keep an eye on long-running work from your phone while your workstation stays at home or in the office.

```
You (in Slack/Lark)          so-bridge           AI Code Assistant
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

- **Stay updated away from your desk** — progress and results flow back into IM, so you do not need to keep checking a terminal window.
- **Turn chat into a remote coding console** — start work, follow execution, and continue driving your AI Code Assistant from Slack or Lark.
- **Keep your workstation where it belongs** — leave your coding machine at home or in the office and keep interacting from your phone through text or voice-friendly chat.
- **Runs locally** — no cloud server, no public URL, no ngrok. Your bot connects to Slack or Lark over WebSocket.
- **Works with real AI coding CLIs** — Codex CLI, Claude Code, Cursor, and more.
- **Browser admin console** — configure the bridge from a clean web UI instead of hand-editing config files.

## Quick Start

Requires Node.js 20 or later.

```bash
npm install
npm run build
npm start
```

Open [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin) in your browser.

That is it. The admin console walks you through the rest:

1. **Add a Bot Connection** — paste your Slack or Lark tokens
2. **Add an AI Assistant** — pick Codex CLI, Claude Code, or Cursor
3. **Select both sides** — choose the bot and assistant you want the bridge to use
4. **Start working from chat** — send a task from IM and follow progress there

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

## AI Code Assistants

| Assistant | CLI Tool | How to install |
| --- | --- | --- |
| Codex CLI | `codex` | [github.com/openai/codex](https://github.com/openai/codex) |
| Claude Code | `claude` | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) |
| Cursor | `cursor` | [cursor.com](https://cursor.com/) |

Install any of these CLI tools, and `so-bridge` can bridge your chat directly into them.

## CLI Commands

Install from npm:

```bash
npm install -g so-bridge
```

Or run it without a global install:

```bash
npx so-bridge --help
```

```bash
so-bridge --help     # Show CLI help
so-bridge --version  # Show installed version
so-bridge config set port 3456  # Save the service port for future starts
so-bridge start --port 3456      # Start once with a temporary port override
so-bridge start     # Start the bridge service
so-bridge status    # Show current bridge state and config paths
so-bridge open      # Open admin console in browser
so-bridge purge     # Remove all local config and state
```

Each command also supports `--help`, for example:

```bash
so-bridge status --help
```

`so-bridge config set port <n>` updates the saved port in local config.
`so-bridge start --port <n>` uses a temporary runtime override for that process only and does not change the saved value.
`so-bridge status` and `so-bridge open` prefer the active runtime port when it is available.

For development, use the npm scripts:

```bash
npm start           # Start (after npm run build)
npm run dev         # Start with auto-reload
npm test            # Run tests
```

## Why It Feels Different

With `so-bridge`, your IM becomes part status dashboard and part remote control:

- Kick off work from chat
- Get progress back in chat while you do something else
- Check in from your phone instead of returning to your desk
- Continue iterating with short follow-ups when the assistant needs direction

That makes it a good fit for side projects, experiments, and any workflow where your coding machine is running somewhere else.

## Streaming

Both platforms support real-time streaming output:

- **Slack** — native streaming API. Responses appear as a thread reply, updating in real-time.
- **Lark** — CardKit streaming. An interactive card updates live as the AI generates output.

Streaming is automatic when your AI assistant supports it.

## License

MIT.
