import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, "../..");
const source = path.join(repositoryRoot, "src", "renderer", "index.html");
const destinationDirectory = path.join(repositoryRoot, "dist", "renderer");

await mkdir(destinationDirectory, { recursive: true });
await cp(source, path.join(destinationDirectory, "index.html"));
