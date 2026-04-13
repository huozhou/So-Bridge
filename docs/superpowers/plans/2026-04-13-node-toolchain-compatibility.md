# Node Toolchain Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the development toolchain Node floor from the current `vite@8` / `rolldown` requirement so ordinary Node `20.x` releases can run `npm test` and `npm run build` without widening user-facing support claims prematurely.

**Architecture:** Keep runtime behavior unchanged and only adjust the development toolchain. Downgrade the `vitest` / `vite` line to a compatible pair, rewrite the version-generation script using a more conservative Node ESM path pattern, then verify that the lockfile no longer pulls in the stricter toolchain floor.

**Tech Stack:** Node.js, npm, TypeScript, Vitest, Vite

---

### Task 1: Downgrade the test/build toolchain

**Files:**
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/package.json`
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/package-lock.json`
- Test: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/tests/cli/commands.test.ts`

- [ ] **Step 1: Update the dev dependency versions in `package.json`**

Replace the current dev toolchain entries with a Node-20-friendly pair:

```json
{
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vite": "^6.4.2",
    "vitest": "^3.2.4"
  }
}
```

Keep the rest of `package.json` unchanged in this step. Do **not** widen `engines` yet.

- [ ] **Step 2: Reinstall dependencies to refresh the lockfile**

Run:

```bash
npm install
```

Expected:
- `package-lock.json` updates
- `vite` resolves to the `6.x` line
- `vitest` resolves to the `3.x` line

- [ ] **Step 3: Verify the downgraded dependency tree**

Run:

```bash
node - <<'NODE'
const lock = require('./package-lock.json');
for (const name of ['vitest', 'vite', 'rolldown']) {
  const pkg = lock.packages[`node_modules/${name}`];
  console.log(name, pkg && pkg.version, pkg && pkg.engines);
}
NODE
```

Expected:
- `vitest` is `3.x`
- `vite` is `6.x`
- no dependency in this chain still requires `^20.19.0 || >=22.12.0`

- [ ] **Step 4: Commit the dependency downgrade**

```bash
git add /Users/StanGuo/Documents/Test/IMBotAndCliBridge/package.json /Users/StanGuo/Documents/Test/IMBotAndCliBridge/package-lock.json
git commit -m "chore: downgrade cli toolchain dependencies"
```

### Task 2: Make the version-generation script more conservative

**Files:**
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/scripts/generate-version.mjs`
- Test: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/tests/cli/commands.test.ts`

- [ ] **Step 1: Replace `import.meta.dirname` with a portable ESM path pattern**

Rewrite the script setup like this:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(filename);
const root = resolve(scriptDir, "..");
const packageJsonPath = resolve(root, "package.json");
const outputJsPath = resolve(root, "generated/version.js");
const outputTypesPath = resolve(root, "generated/version.d.ts");
```

Keep the existing file-generation behavior unchanged after this path setup.

- [ ] **Step 2: Run the sync script directly**

Run:

```bash
npm run sync:version
```

Expected:
- command exits successfully
- `generated/version.js` and `generated/version.d.ts` still contain the package version

- [ ] **Step 3: Re-run the focused CLI tests**

Run:

```bash
npm test -- tests/cli/commands.test.ts
```

Expected:
- CLI version/help tests still pass

- [ ] **Step 4: Commit the script compatibility fix**

```bash
git add /Users/StanGuo/Documents/Test/IMBotAndCliBridge/scripts/generate-version.mjs /Users/StanGuo/Documents/Test/IMBotAndCliBridge/tests/cli/commands.test.ts
git commit -m "fix: make version generation script more portable"
```

### Task 3: Validate the lower Node-floor toolchain and adjust support metadata

**Files:**
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/package.json`
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/README.md`
- Modify: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/README.zh-CN.md`
- Test: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/tests/cli/browser.test.ts`
- Test: `/Users/StanGuo/Documents/Test/IMBotAndCliBridge/tests/backends/command-discovery.test.ts`

- [ ] **Step 1: Run the full validation commands**

Run:

```bash
npm test
npm run build
```

Expected:
- both commands pass with the downgraded toolchain

- [ ] **Step 2: Relax the `engines` field if validation confirms the lower floor**

If Task 1 and Task 3 validation passed without any `20.19+`-specific dependency floor remaining, update `package.json` to:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

If validation shows a stricter floor still exists, do **not** widen this field and instead document the blocker inline in the commit message for this task.

- [ ] **Step 3: Align the README wording with the verified support story**

Add a short CLI/runtime note like this to both READMEs:

```md
Running the published CLI works on modern Node 20+.
If you are developing in this repository, use the toolchain versions verified by `npm test` and `npm run build`.
```

Chinese README equivalent:

```md
发布后的 CLI 适用于现代 Node 20+ 环境。
如果你是在这个仓库里做开发，请以 `npm test` 和 `npm run build` 实际验证通过的工具链为准。
```

- [ ] **Step 4: Run the targeted regression checks**

Run:

```bash
npm test -- tests/backends/command-discovery.test.ts tests/cli/browser.test.ts tests/cli/commands.test.ts
```

Expected:
- all focused CLI and compatibility tests pass

- [ ] **Step 5: Commit the compatibility validation and metadata update**

```bash
git add /Users/StanGuo/Documents/Test/IMBotAndCliBridge/package.json /Users/StanGuo/Documents/Test/IMBotAndCliBridge/README.md /Users/StanGuo/Documents/Test/IMBotAndCliBridge/README.zh-CN.md
git commit -m "docs: align node support with downgraded toolchain"
```
