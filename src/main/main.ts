import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSecureWindowOptions } from "./window-options.js";
import type { RuntimeInfo } from "../shared/runtime-contract.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererIndexPath = path.join(currentDirectory, "../renderer/index.html");
const preloadPath = path.join(currentDirectory, "../preload/preload.js");
const smokeMode = process.argv.includes("--m1-smoke");

function getRuntimeInfo(): RuntimeInfo {
  return {
    mode: "LOCAL_ONLY",
    applicationVersion: app.getVersion()
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle("runtime:get-info", (): RuntimeInfo => getRuntimeInfo());
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow(createSecureWindowOptions(preloadPath));
  await window.loadFile(rendererIndexPath);
  window.show();
  return window;
}

async function runSmoke(window: BrowserWindow): Promise<void> {
  const bridgeAvailable = await window.webContents.executeJavaScript(
    "typeof window.eyeMate?.getRuntimeInfo === 'function'",
    true
  );

  if (!bridgeAvailable) {
    throw new Error("M1_PRELOAD_BRIDGE_UNAVAILABLE");
  }

  const runtimeMode = await window.webContents.executeJavaScript(
    "window.eyeMate.getRuntimeInfo().then((value) => value.mode)",
    true
  );

  if (runtimeMode !== "LOCAL_ONLY") {
    throw new Error("M1_RUNTIME_MODE_INVALID");
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  const window = await createMainWindow();

  if (smokeMode) {
    try {
      await runSmoke(window);
      app.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "M1_SMOKE_FAILED");
      app.exit(1);
    }
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "M1_BOOT_FAILED");
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
