import type { BrowserWindowConstructorOptions } from "electron";

export function createSecureWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: "#090F1A",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#090F1A",
      symbolColor: "#7A9BBF",
      height: 38
    },
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
