import assert from "node:assert/strict";
import test from "node:test";
import { createSecureWindowOptions } from "../../main/window-options.js";

test("cửa sổ Electron giữ renderer cô lập và không có Node integration", () => {
  const options = createSecureWindowOptions("C:/fixture/preload.js");
  assert.equal(options.webPreferences?.contextIsolation, true);
  assert.equal(options.webPreferences?.nodeIntegration, false);
  assert.equal(options.webPreferences?.sandbox, false);
  assert.equal(options.webPreferences?.preload, "C:/fixture/preload.js");
});
