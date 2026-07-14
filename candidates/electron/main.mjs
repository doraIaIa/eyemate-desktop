import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';

const page = new URL('../shared/index.html', import.meta.url);
const testMode = process.argv.includes('--test');
const holdArg = process.argv.find((argument) => argument.startsWith('--m0-hold-ms='));
const holdMs = holdArg ? Math.max(0, Number(holdArg.slice('--m0-hold-ms='.length)) || 0) : 0;
let window;
app.whenReady().then(async () => {
  window = new BrowserWindow({ width: 800, height: 600, show: !testMode, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await window.loadURL(page.href);
  if (testMode) setTimeout(() => app.quit(), holdMs);
});
app.on('window-all-closed', () => app.quit());
