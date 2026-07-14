import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
const failures = [];
for (const file of (await files(path.join(root, "src"))).filter((item) => item.endsWith(".ts"))) {
  const source = await readFile(file, "utf8");
  if (/\b(fetch|WebSocket|XMLHttpRequest|https?:\/\/)\b/i.test(source)) failures.push(`NETWORK_REFERENCE:${path.relative(root, file)}`);
  if (/\b(rawFrame|raw_frame|videoFrame|rawLandmarks?|pixelBuffer)\b/i.test(source)) failures.push(`FORBIDDEN_RAW_FIELD:${path.relative(root, file)}`);
}
if (failures.length > 0) throw new Error(failures.join("\n"));
console.log("M1 privacy boundary scan PASS");
