import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(root, "package.json");
const outputJsPath = resolve(root, "generated/version.js");
const outputTypesPath = resolve(root, "generated/version.d.ts");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const nextJsContent = `export const CLI_VERSION = "${packageJson.version}";\n`;
const nextTypesContent = `export declare const CLI_VERSION: "${packageJson.version}";\n`;

await mkdir(dirname(outputJsPath), { recursive: true });

let currentJsContent = "";
try {
  currentJsContent = await readFile(outputJsPath, "utf8");
} catch {
  currentJsContent = "";
}

let currentTypesContent = "";
try {
  currentTypesContent = await readFile(outputTypesPath, "utf8");
} catch {
  currentTypesContent = "";
}

if (currentJsContent !== nextJsContent) {
  await writeFile(outputJsPath, nextJsContent, "utf8");
}

if (currentTypesContent !== nextTypesContent) {
  await writeFile(outputTypesPath, nextTypesContent, "utf8");
}
