import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, "../..");
const sourceDirectory = path.join(repositoryRoot, "src", "renderer");
const destinationDirectory = path.join(repositoryRoot, "dist", "renderer");

await mkdir(destinationDirectory, { recursive: true });
for (const asset of ["index.html", "styles.css"]) {
  await cp(path.join(sourceDirectory, asset), path.join(destinationDirectory, asset));
}
