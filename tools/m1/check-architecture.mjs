import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  }));
  return files.flat();
}

const failures = [];
const rendererFiles = await listFiles(path.join(root, "src", "renderer"));
for (const file of rendererFiles.filter((candidate) => candidate.endsWith(".ts"))) {
  const content = await readFile(file, "utf8");
  if (/\b(electron|ipcRenderer|require\s*\()\b/.test(content)) {
    failures.push(`RENDERER_DIRECT_PLATFORM_IMPORT:${path.relative(root, file)}`);
  }
}

const domainPath = path.join(root, "src", "domain");
try {
  const domainFiles = await listFiles(domainPath);
  for (const file of domainFiles.filter((candidate) => candidate.endsWith(".ts"))) {
    const content = await readFile(file, "utf8");
    if (/\b(electron|sqlite|mediapipe|onnx|document|window)\b/i.test(content)) {
      failures.push(`DOMAIN_BOUNDARY_VIOLATION:${path.relative(root, file)}`);
    }
  }
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log("M1 architecture check PASS");
