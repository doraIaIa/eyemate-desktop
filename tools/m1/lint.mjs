import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.join(root, "src");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(fullPath));
    else if (entry.name.endsWith(".ts")) result.push(fullPath);
  }
  return result;
}

const failures = [];
for (const file of await listFiles(sourceRoot)) {
  const content = await readFile(file, "utf8");
  if (content.includes("\t")) failures.push(`TAB_CHARACTER:${path.relative(root, file)}`);
  if (/\bTODO\b/.test(content)) failures.push(`TODO_NOT_ALLOWED:${path.relative(root, file)}`);
}
if (failures.length > 0) throw new Error(failures.join("\n"));
console.log("M1 lint PASS");
