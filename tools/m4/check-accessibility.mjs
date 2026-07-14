import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const html = await readFile(path.join(root, "src", "renderer", "index.html"), "utf8");
const styles = await readFile(path.join(root, "src", "renderer", "styles.css"), "utf8");
const failures = [];
if (!html.includes("Content-Security-Policy")) failures.push("CSP_MISSING");
if (!styles.includes(":focus-visible")) failures.push("VISIBLE_FOCUS_MISSING");
for (const label of html.matchAll(/<label\s+for="([^"]+)"/g)) {
  if (!new RegExp(`<(?:input|select|textarea)[^>]+id="${label[1]}"`, "i").test(html)) failures.push(`LABEL_TARGET_MISSING:${label[1]}`);
}
for (const button of html.matchAll(/<button\b([^>]*)>/g)) {
  if (!/\btype="button"/.test(button[1])) failures.push("BUTTON_TYPE_MISSING");
}
if (/<(audio|video)[^>]+autoplay/i.test(html)) failures.push("AUTOPLAY_MEDIA_FORBIDDEN");
if (failures.length) throw new Error(failures.join("\n"));
console.log("M4_ACCESSIBILITY_STATIC_PASS");
