import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
async function files(directory) { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat(); }
const sourceFiles = (await files(path.join(root, "src"))).filter((file) => file.endsWith(".ts") || file.endsWith(".html"));
const failures = [];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  if (/remote\.require|enableRemoteModule|webviewTag\s*:\s*true/i.test(source)) failures.push(`UNSAFE_ELECTRON_CAPABILITY:${path.relative(root, file)}`);
  if (/(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}/i.test(source)) failures.push(`POSSIBLE_EMBEDDED_SECRET:${path.relative(root, file)}`);
}
const main = await readFile(path.join(root, "src", "main", "main.ts"), "utf8");
const html = await readFile(path.join(root, "src", "renderer", "index.html"), "utf8");
if (!main.includes("setWindowOpenHandler") || !main.includes("will-navigate")) failures.push("NAVIGATION_GUARD_MISSING");
if (!html.includes("Content-Security-Policy") || !html.includes("connect-src 'self'") || /https?:\/\//i.test(html)) failures.push("LOCAL_ONLY_CSP_MISSING");
if (failures.length) throw new Error(failures.join("\n"));
console.log("M4_SECURITY_POSTURE_PASS");
