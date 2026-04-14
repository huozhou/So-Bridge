# Server Port Configuration Design

- Date: 2026-04-14
- Status: Proposed

## Summary

Add a configurable service port that can be changed from both CLI and UI.

The feature must support:

- a saved port in persistent config
- a temporary `so-bridge start --port <n>` override for one process launch
- admin UI visibility into both the saved port and the currently running port
- `so-bridge open` and `so-bridge status` awareness of runtime overrides

The service remains a single process. The admin UI continues to be served from the same Express server as `/health`, `/webhook`, and `/confirm`.

## Goals

- Allow users to persistently change the service port from CLI and UI.
- Allow users to temporarily override the port for a single `start` command.
- Keep the saved port unchanged when `start --port` is used.
- Make runtime and saved port differences visible in CLI and UI.
- Keep the implementation aligned with the current storage model and process model.

## Non-Goals

- No automatic restart after changing the saved port.
- No separate admin process.
- No host configuration in this change.
- No requirement that the UI only edits the port while the service is stopped.

## Current State

The server host and port are hard-coded in `src/index.ts` as `127.0.0.1:3000`.

Current implications:

- CLI default URLs assume port `3000`.
- Admin UI does not expose any server settings.
- Config and state models do not describe service port information.
- There is no runtime record of the effective listening port.

## Chosen Approach

Use a two-layer model:

1. Saved configuration in `config.server.port`
2. Runtime server info in `state.runtimeServer`

This keeps persistent intent and actual runtime state separate while reusing the existing `config.json` and `state.json` files.

## Data Model Changes

### Config

Extend `SoBridgeConfig` with:

```ts
server: {
  port: number;
}
```

Default value:

```ts
server: {
  port: 3000;
}
```

### State

Extend `SoBridgeState` with:

```ts
runtimeServer: {
  host: string;
  port: number;
  startedAt: string;
} | null;
```

`runtimeServer` reflects the active process that successfully called `listen()`.

## Validation Rules

Port validation is centralized in the config validator and reused by CLI and admin service.

Rules:

- Port must be an integer.
- Port must be between `1` and `65535`.
- Missing port falls back to the default `3000`.

State normalization rules:

- `runtimeServer` may be `null`.
- When present, `host` must be a string.
- When present, `port` must be a valid integer port.
- When present, `startedAt` must be a string.

## Runtime Resolution

The server computes an `effectivePort` at startup:

1. If CLI provides `start --port <n>`, use that value.
2. Otherwise use `config.server.port`.

The temporary CLI override does not write back to config.

After the Express app starts listening successfully:

- write `runtimeServer.host`
- write `runtimeServer.port`
- write `runtimeServer.startedAt`

On normal shutdown, clear `runtimeServer`.

Because abnormal exits may leave stale runtime state behind, consumers must verify runtime data with a health check before trusting it.

## CLI Design

### `so-bridge start --port <n>`

- Starts the service on the provided port.
- Does not update `config.server.port`.
- Fails fast with a clear validation error for invalid port values.
- If the port is already in use, print a direct error such as `Port 3456 is already in use`.

### `so-bridge config set port <n>`

- Updates `config.server.port`.
- Does not restart the service.
- Does not change the current runtime port for an already-running process.

### `so-bridge open`

Resolution order:

1. Read runtime port from state.
2. Probe `http://127.0.0.1:<runtimePort>/health`.
3. If healthy, open `http://127.0.0.1:<runtimePort>/admin`.
4. Otherwise fall back to the saved port URL.

If fallback occurs, the command should explain that the runtime port record appears stale or unreachable.

### `so-bridge status`

Show:

- active profile
- saved port
- runtime port when present
- a note when a temporary override is active

If runtime port fails health verification, keep showing it but mark it as stale.

If runtime port and saved port differ, print an explicit indicator such as `Temporary port override active`.

## Admin UI Design

### Settings Page

Add a `Server` section to `/admin/settings` with:

- `Server Port` numeric input
- helper copy that the saved port applies on the next start
- helper copy that the current running port may differ because of a temporary CLI override
- save action wired to a dedicated server settings API

The settings page edits only the saved port.

### Main Admin Page

Expose current port status on `/admin`:

- current runtime address when healthy
- saved port
- stale runtime note when runtime state exists but the health probe fails
- a mismatch notice when runtime and saved ports differ

Example:

- `Running at http://127.0.0.1:3456`
- `Saved port: 3000`
- `Temporary override active`

## Admin API Design

### Read APIs

Extend current admin DTOs to include server information.

`GET /api/admin/current-bridge` should include:

- `runtimeServer`
- `savedServer`

`GET /api/admin/resources` should include:

- `server`

### Write API

Add:

`PUT /api/admin/server-settings`

Request body:

```json
{
  "port": 3456
}
```

Behavior:

- validate port
- update `config.server.port`
- preserve current runtime state
- return the updated saved server config

This API stays separate from directory policy so the responsibilities remain clear.

## Health-Check Fallback Logic

Runtime state is advisory, not authoritative on its own.

Consumers that need the current port must:

1. read runtime server info from state
2. probe its `/health` endpoint
3. trust it only when the probe succeeds
4. otherwise fall back to the saved port

This logic applies to:

- `so-bridge open`
- `so-bridge status`
- admin page status presentation

## Module Boundaries

- `src/models/*`
  - extend config/state types and defaults
  - validate server config and runtime server state
- `src/storage/*`
  - continue using existing config/state files
- `src/index.ts`
  - accept optional startup port override
  - compute effective port
  - persist runtime server info on successful startup
- `src/cli/*`
  - parse `start --port`
  - add `config set port`
  - resolve runtime versus saved port for `open` and `status`
- `src/admin/*`
  - expose server settings in DTOs
  - add server settings write endpoint
  - render saved/runtime port state in UI

## Error Handling

- Invalid saved port in config:
  - fail validation with a direct config error
- Invalid CLI `--port` input:
  - fail before startup with a direct argument error
- Port in use:
  - surface a clear startup error
- Stale runtime state:
  - ignore after failed health probe
  - fall back to saved port
- Saved/runtime mismatch:
  - show as informational state, not an error

## Testing Plan

Add or update tests for:

- config default includes `server.port`
- validator accepts valid ports and rejects invalid ports
- state normalization for `runtimeServer`
- `start --port` uses override without writing saved config
- `config set port` updates persistent config
- `open` prefers healthy runtime port and falls back when runtime is stale
- `status` prints both saved and runtime ports and mismatch notice
- admin routes expose server settings
- admin service updates saved port correctly
- admin UI renders saved port input and runtime/saved status copy

## Rollout Notes

- Existing users migrate automatically through default config normalization.
- Documentation updates should cover:
  - the new CLI command
  - the `start --port` override behavior
  - the difference between saved port and runtime port
