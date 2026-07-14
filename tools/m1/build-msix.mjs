import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, ".m1", "msix");
const stage = path.join(output, "stage");
const packagePath = path.join(output, "eyemate-m1.msix");
const makeAppx = "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\makeappx.exe";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`MSIX_BUILD_FAILED_${code ?? 1}`)));
  });
}

if (!existsSync(makeAppx)) throw new Error("MAKEAPPX_NOT_FOUND");
await rm(output, { recursive: true, force: true });
await mkdir(path.join(stage, "resources", "app"), { recursive: true });
await cp(path.join(root, "node_modules", "electron", "dist"), stage, { recursive: true });
await cp(path.join(root, "dist"), path.join(stage, "resources", "app", "dist"), { recursive: true });
await rm(path.join(stage, "resources", "app", "dist", "tests"), { recursive: true, force: true });
await writeFile(path.join(stage, "resources", "app", "package.json"), JSON.stringify({ type: "module", main: "dist/main/main.js" }));
await mkdir(path.join(stage, "Assets"), { recursive: true });
const icon = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLxVQAAAABJRU5ErkJggg==", "base64");
for (const name of ["Square150x150Logo.png", "Square44x44Logo.png", "StoreLogo.png"]) await writeFile(path.join(stage, "Assets", name), icon);
const manifest = `<?xml version="1.0" encoding="utf-8"?><Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10" xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10" xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities" IgnorableNamespaces="uap rescap"><Identity Name="EyeMateM1.Local" Publisher="CN=EyeMate M1 Internal" Version="0.1.0.0" ProcessorArchitecture="x64"/><Properties><DisplayName>EyeMate M1 Internal</DisplayName><PublisherDisplayName>EyeMate</PublisherDisplayName><Logo>Assets\\StoreLogo.png</Logo></Properties><Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0"/></Dependencies><Resources><Resource Language="en-us"/></Resources><Applications><Application Id="App" Executable="electron.exe" EntryPoint="Windows.FullTrustApplication"><uap:VisualElements DisplayName="EyeMate M1 Internal" Description="EyeMate M1 local build" Square150x150Logo="Assets\\Square150x150Logo.png" Square44x44Logo="Assets\\Square44x44Logo.png" BackgroundColor="transparent"/></Application></Applications><Capabilities><rescap:Capability Name="runFullTrust"/></Capabilities></Package>`;
await writeFile(path.join(stage, "AppxManifest.xml"), manifest);
await run(makeAppx, ["pack", "/d", stage, "/p", packagePath, "/overwrite"]);
await run(path.join(stage, "electron.exe"), [path.join(stage, "resources", "app", "dist", "main", "main.js"), "--m1-smoke"]);
console.log("M1_MSIX_BUILD_PASS");
