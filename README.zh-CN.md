# so-bridge

[English](./README.md) | 简体中文

![CI](https://img.shields.io/github/actions/workflow/status/huozhou/So-Bridge/node.js.yml?branch=main&label=CI)
![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/github/license/huozhou/So-Bridge)
![GitHub release](https://img.shields.io/github/v/release/huozhou/So-Bridge)
<!-- ![GitHub stars](https://img.shields.io/github/stars/huozhou/So-Bridge?style=social) -->

把你的即时通讯工具直接连接到 AI Code Assistant CLI。

`so-bridge` 是一个本地桥接服务，把 Slack 或飞书连接到你的 AI 编码助手。你可以直接在 IM 里发起任务、接收进度更新和结果，不必一直盯着终端或工作机。

```
你（在 Slack / 飞书）        so-bridge           AI Code Assistant
                          ┌────────────┐
 “Review PR #42”    ───▶  │  Local     │  ───▶  Codex CLI
 “Run the tests”          │  Bridge    │        Claude Code
 “Add a billing API”      │  Service   │        Cursor
                          └────────────┘        ...
                                │
                                ▼
                      浏览器管理界面
                   http://127.0.0.1:3000/admin
```

## 为什么使用 so-bridge？

- **不用一直守在电脑前**：任务进度和结果会回到 IM，你不需要反复查看终端窗口。
- **把聊天工具变成远程编码入口**：可以从 Slack 或飞书发起任务、跟踪执行状态，并继续驱动 AI Code Assistant。
- **工作机放在家里或办公室也没关系**：你仍然可以通过手机里的文字或语音消息继续推进开发。
- **本地运行**：不需要云端服务、不需要公网地址，也不需要 ngrok。
- **连接真实的 AI 编码 CLI**：支持 Codex CLI、Claude Code、Cursor 等工具。
- **带管理界面**：可以通过浏览器配置 bridge，而不是手动编辑配置文件。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm start
```

然后在浏览器中打开 [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin)。

管理界面会引导你完成以下步骤：

1. **Add a Bot Connection**：填入 Slack 或飞书的接入信息
2. **Add an AI Assistant**：选择 Codex CLI、Claude Code 或 Cursor
3. **Select both sides**：选择当前 bridge 要连接的 Bot 和 AI 助手
4. **Start working from chat**：直接从 IM 发起任务并查看进度

## 连接 Slack

1. 在 [api.slack.com/apps](https://api.slack.com/apps) 创建 Slack App
2. 在 Settings 中启用 **Socket Mode**
3. 创建带 `connections:write` 权限的 **App-Level Token**（`xapp-...`）
4. 添加 **Bot Token Scopes**：`chat:write`、`im:read`
5. 订阅 **Events**：`message.im`、`app_mention`
6. 安装应用到工作区，并复制 **Bot Token**（`xoxb-...`）
7. 在管理界面中填入这些信息

## 连接飞书（Lark / Feishu）

1. 在 [open.feishu.cn/app](https://open.feishu.cn/app) 创建自建应用
2. 添加权限：`im:message`、`im:message:send_as_bot`
3. 订阅事件：`im.message.receive_v1`
4. 为事件订阅启用 **WebSocket** 模式
5. 复制 **App ID** 和 **App Secret**
6. 在管理界面中填入这些信息

## 支持的 AI Code Assistant

| 助手 | CLI 工具 | 安装方式 |
| --- | --- | --- |
| Codex CLI | `codex` | [github.com/openai/codex](https://github.com/openai/codex) |
| Claude Code | `claude` | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) |
| Cursor | `cursor` | [cursor.com](https://cursor.com/) |

安装这些 CLI 工具后，`so-bridge` 就可以把聊天消息桥接到它们。

## CLI 命令

可以直接通过 npm 安装：

```bash
npm install -g so-bridge
```

如果不想全局安装，也可以直接运行：

```bash
npx so-bridge --help
```

```bash
so-bridge --help     # 查看 CLI 帮助
so-bridge --version  # 查看当前版本
so-bridge config set port 3456  # 持久保存服务端口
so-bridge start --port 3456      # 仅本次启动临时覆盖端口
so-bridge start     # 启动 bridge 服务
so-bridge status    # 查看当前 bridge 状态和配置路径
so-bridge open      # 在浏览器中打开管理界面
so-bridge purge     # 删除本地配置和状态
```

每个子命令也支持 `--help`，例如：

```bash
so-bridge status --help
```

`so-bridge config set port <n>` 会把端口保存到本地配置中。
`so-bridge start --port <n>` 只会为当前进程使用临时运行时端口，不会修改已保存的端口。
`so-bridge status` 和 `so-bridge open` 会优先使用当前可用的运行时端口。

开发时也可以使用 npm scripts：

```bash
npm start           # 启动（需先执行 npm run build）
npm run dev         # 以自动重载模式启动
npm test            # 运行测试
```

## 为什么这种方式更方便

有了 `so-bridge`，IM 不只是通知通道，也可以成为你的远程开发入口：

- 在聊天里发起任务
- 在聊天里接收进度更新
- 离开工位后也能查看执行状态
- 通过简短的追问继续驱动 AI 助手完成工作

这很适合个人项目、实验性功能和任何“工作机在别处运行”的开发场景。

## 流式输出

两个平台都支持实时流式输出：

- **Slack**：使用原生 streaming API，结果会在会话线程中实时更新
- **飞书**：使用 CardKit streaming，交互式卡片会随着生成过程持续刷新

只要你的 AI 助手支持流式输出，`so-bridge` 就会自动使用。

## 工作原理

`so-bridge` 运行在你的机器上，只维护一条当前启用的桥接关系：

```
Bot Connection  ──▶  so-bridge  ──▶  AI Assistant
```

所有配置都保存在本地用户目录中：

| 系统 | 路径 |
| --- | --- |
| macOS | `~/Library/Application Support/so-bridge/` |
| Linux | `~/.config/so-bridge/` |
| Windows | `%AppData%\so-bridge\` |

管理界面 `http://127.0.0.1:3000/admin` 目前用于管理：

- **Bot Connections**：Slack / 飞书 bot 接入信息
- **AI Assistants**：当前要连接的 AI 编码工具
- **Current Bridge**：当前由哪个 Bot 连接到哪个 AI 助手

## License

MIT.
