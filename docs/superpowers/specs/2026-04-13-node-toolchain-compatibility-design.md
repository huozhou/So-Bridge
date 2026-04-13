---
date: 2026-04-13
topic: node-toolchain-compatibility
---

# Node Toolchain Compatibility

## Problem Frame

The published `so-bridge` CLI should not force users onto unusually new Node patch releases just because the local development toolchain moved to newer `vite` and `rolldown` versions.

The current repository state mixes two different concerns:

- runtime compatibility for users who install and run the CLI
- development compatibility for contributors who run `npm test` and `npm run build`

Recent failures showed that the current toolchain raises the effective floor to Node `20.19+` through `vite@8` and `rolldown`, even though the runtime code itself does not justify that narrow requirement.

## Requirements

**Dependency Strategy**
- R1. The development toolchain should be downgraded to a version set that works on ordinary Node `20.x` releases instead of requiring `20.19+`.
- R2. The downgrade should be minimal and focused on toolchain dependencies, not runtime dependencies.
- R3. The solution should avoid unnecessary framework or test-runner replacement.

**Scope Control**
- R4. Runtime application code should remain unchanged unless a toolchain incompatibility forces a small compatibility adjustment.
- R5. The version-generation script should be rewritten to avoid depending on newer Node-specific conveniences when a more portable equivalent exists.
- R6. The change should not broaden the CLI's published support claim until validation confirms the toolchain floor actually dropped.

**Validation**
- R7. The selected dependency versions must be validated by reinstalling dependencies and running `npm test` and `npm run build`.
- R8. The resulting dependency tree should no longer depend on a `vite` line that requires Node `20.19+`.
- R9. If the downgrade succeeds, the project should be able to safely relax its Node support messaging and metadata.

## Success Criteria

- `npm test` succeeds on a wider Node `20.x` range than the current `vite@8` / `rolldown` toolchain allows.
- `npm run build` succeeds with the downgraded toolchain.
- The repo no longer relies on `vite@7/8`-era Node floor requirements.
- The change remains limited to the development toolchain and related support scripts.

## Scope Boundaries

- Do not replace Vitest with a different test framework.
- Do not redesign the runtime CLI behavior as part of this work.
- Do not widen the published Node version requirement until the downgraded toolchain is verified.
- Do not treat Node 18 support as a target for this iteration.

## Key Decisions

- `vitest` should be downgraded from the current `4.x` line to the `3.x` line.
  - Rationale: it materially lowers the Node floor without forcing a larger test framework migration.
- `vite` should be pinned to the `6.x` line.
  - Rationale: `vite@6` keeps the toolchain on a broadly compatible Node range, while `vite@7/8` raises the floor to `20.19+`.
- The version-generation script should be rewritten with a more conservative ESM path pattern.
  - Rationale: contributors should not be blocked by toolchain scripts that depend on newer runtime conveniences when a portable alternative is available.

## Dependencies / Assumptions

- The current Node floor pressure comes primarily from `vitest -> vite -> rolldown`, not from runtime dependencies like `express`, `ws`, or `uuid`.
- The current codebase and tests are expected to remain compatible with `vitest@3` and `vite@6` without significant source changes.

## Outstanding Questions

### Resolve Before Planning
- None.

### Deferred to Planning
- Which exact `vitest@3.x` and `vite@6.x` patch versions should be selected for the smallest, safest downgrade.
- Whether `rolldown` disappears entirely or remains present with a lower compatibility impact after the downgrade.
- Whether the final `package.json` `engines` field should be changed to a broader value after verification.
