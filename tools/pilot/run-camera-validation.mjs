import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const smokeMode = process.argv.includes("--smoke");
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(permission === "media" && webContents.getURL().startsWith("file:")));
  const window = new BrowserWindow({ width: 1040, height: 780, backgroundColor: "#090F1A", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, target) => { if (!target.startsWith("file:")) event.preventDefault(); });
  await window.loadFile(path.join(directory, "camera-harness.html"));
  if (smokeMode) {
    const result = await window.webContents.executeJavaScript("document.querySelector('#summary').textContent.includes('pilot-camera-validation/0.1.0') && !document.querySelector('#start').disabled && document.querySelector('#stop').disabled", true);
    if (result !== true) throw new Error("CAMERA_HARNESS_SMOKE_INVALID");
    console.log("CAMERA_HARNESS_SMOKE_PASS");
    app.quit();
  }
});
app.on("window-all-closed", () => app.quit());
