import assert from "node:assert/strict";
import test from "node:test";
import { isRuntimeInfo } from "../../shared/runtime-contract.js";

test("runtime contract chỉ chấp nhận Local Only với phiên bản chuỗi", () => {
  assert.equal(isRuntimeInfo({ mode: "LOCAL_ONLY", applicationVersion: "0.1.0", developerPanelEnabled: false, dataMode: "REAL_LOCAL" }), true);
  assert.equal(isRuntimeInfo({ mode: "LOCAL_ONLY", applicationVersion: "0.1.0", developerPanelEnabled: false, dataMode: "SYNTHETIC_DEMO" }), true);
  assert.equal(isRuntimeInfo({ mode: "CLOUD", applicationVersion: "0.1.0", developerPanelEnabled: false, dataMode: "REAL_LOCAL" }), false);
  assert.equal(isRuntimeInfo({ mode: "LOCAL_ONLY", applicationVersion: 1, developerPanelEnabled: false, dataMode: "REAL_LOCAL" }), false);
  assert.equal(isRuntimeInfo({ mode: "LOCAL_ONLY", applicationVersion: "0.1.0" }), false);
});
