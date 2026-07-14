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

const vendorDirectory = path.join(destinationDirectory, "vendor");
await mkdir(vendorDirectory, { recursive: true });
await cp(path.join(repositoryRoot, "node_modules", "@mediapipe", "tasks-vision", "vision_bundle.mjs"), path.join(vendorDirectory, "vision_bundle.mjs"));
await cp(path.join(repositoryRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm"), path.join(vendorDirectory, "wasm"), { recursive: true });
await mkdir(path.join(destinationDirectory, "models"), { recursive: true });
await cp(path.join(repositoryRoot, "assets", "camera", "face_landmarker.task"), path.join(destinationDirectory, "models", "face_landmarker.task"));
