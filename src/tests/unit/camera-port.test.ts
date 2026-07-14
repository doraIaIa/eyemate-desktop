import assert from "node:assert/strict";
import test from "node:test";
import { rejectLowQuality, requestCameraStart, type CameraAdapter } from "../../camera/camera-port.js";

function adapter(result: "DENIED" | "UNAVAILABLE" | "BUSY" | "STARTED"): CameraAdapter { return { async start() { return result; }, async stop() {} }; }

test("camera không khởi tạo khi thiếu consent hoặc explicit action", async () => {
  assert.equal((await requestCameraStart({ explicitUserAction: true, cameraConsentGranted: false }, adapter("STARTED"))).state, "SKIPPED_NO_CONSENT");
  assert.equal((await requestCameraStart({ explicitUserAction: false, cameraConsentGranted: true }, adapter("STARTED"))).state, "IDLE");
});
test("camera denied, unavailable và busy đều abstain", async () => {
  assert.equal((await requestCameraStart({ explicitUserAction: true, cameraConsentGranted: true }, adapter("DENIED"))).state, "PERMISSION_DENIED");
  assert.equal((await requestCameraStart({ explicitUserAction: true, cameraConsentGranted: true }, adapter("UNAVAILABLE"))).state, "CAMERA_UNAVAILABLE");
  assert.equal((await requestCameraStart({ explicitUserAction: true, cameraConsentGranted: true }, adapter("BUSY"))).state, "CAMERA_BUSY");
});
test("low quality là UNKNOWN thay vì giá trị đo", () => assert.deepEqual(rejectLowQuality(), { state: "LOW_QUALITY", reasonCode: "CAMERA_LOW_QUALITY", measurementStatus: "UNKNOWN_LOW_QUALITY" }));
