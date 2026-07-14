import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';

const page = new URL('../shared/index.html', import.meta.url);
let window;
app.whenReady().then(async () => {
  window = new BrowserWindow({ width: 800, height: 600, show: !process.argv.includes('--test'), webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await window.loadURL(page.href);
  if (process.argv.includes('--test')) app.quit();
});
app.on('window-all-closed', () => app.quit());
