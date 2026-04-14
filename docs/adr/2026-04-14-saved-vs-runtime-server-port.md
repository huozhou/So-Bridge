# Saved vs Runtime Server Port

- Date: 2026-04-14
- Status: Accepted

## Context

The bridge needs one saved server port in local config and one temporary runtime port override for a single `start` command. The CLI and documentation must explain both values clearly without making the saved port drift when a temporary override is used.

## Decision

- Persist the default service port in `config.server.port`.
- Allow `so-bridge start --port <n>` to override the listening port for that process only.
- Keep `so-bridge config set port <n>` as the persistent way to change the saved port.
- Treat runtime overrides as transient and do not write them back to config.

## Consequences

- `status` and `open` must prefer the active runtime port when it is available.
- The saved port and runtime port can differ, so the UI and docs need to name both values.
- Stale runtime state can remain after abnormal exits, so consumers must tolerate it.
