import type { BrowserWindowConstructorOptions } from "electron";

export function createSecureWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: "#f5f7fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Preload là ESM local và là bridge duy nhất giữa renderer với main.
      // Renderer vẫn không có Node integration và luôn context-isolated.
      sandbox: false,
      preload: preloadPath
    }
  };
}
