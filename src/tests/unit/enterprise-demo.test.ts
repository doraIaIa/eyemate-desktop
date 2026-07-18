import assert from "node:assert/strict";
import test from "node:test";
import { createEnterpriseDemoModel, validateEnterpriseDemoBoundary } from "../../enterprise-demo/enterprise-demo-data.js";
import { ENTERPRISE_DEMO_HASH, isEnterpriseDemoMode, shouldInitializePersonalStorage } from "../../main/enterprise-demo-mode.js";

test("enterprise demo mặc định dùng dữ liệu synthetic và đóng góp aggregate OFF", () => {
  const model = createEnterpriseDemoModel();
  assert.equal(model.policy.syntheticDataOnly, true);
  assert.equal(model.policy.defaultAggregateParticipation, false);
  assert.equal(model.policy.networkAllowed, false);
  assert.deepEqual(validateEnterpriseDemoBoundary(model), []);
});

test("enterprise demo khóa các năng lực employer bị cấm", () => {
  const model = createEnterpriseDemoModel();
  assert.equal(model.policy.cameraCoercionAllowed, false);
  assert.equal(model.policy.managerDrillDownAllowed, false);
  assert.equal(model.policy.identityInsightsJoinAllowed, false);
  assert.equal(model.policy.realtimePresenceAllowed, false);
  assert.ok(model.forbiddenEmployerFeatures.some((item) => item.includes("Camera stream")));
  assert.ok(model.forbiddenEmployerFeatures.some((item) => item.includes("Manager drill-down")));
});

test("enterprise demo có suppressed cohort và không tạo focus/fatigue/productivity metric", () => {
  const model = createEnterpriseDemoModel();
  assert.ok(model.cohorts.some((cohort) => cohort.status === "suppressed"));
  const metricText = model.metrics.map((metric) => `${metric.id} ${metric.label}`).join(" ").toLowerCase();
  assert.equal(/\bfocus score\b|\bfatigue score\b|\bproductivity score\b|\bhealth score\b/.test(metricText), false);
});

test("enterprise demo mode không khởi tạo personal storage", () => {
  assert.equal(ENTERPRISE_DEMO_HASH, "enterprise-demo/overview");
  assert.equal(isEnterpriseDemoMode(["electron", "main.js", "--enterprise-demo"], {}), true);
  assert.equal(isEnterpriseDemoMode(["electron", "main.js"], { EYEMATE_ENTERPRISE_DEMO: "1" }), true);
  assert.equal(shouldInitializePersonalStorage(true), false);
  assert.equal(shouldInitializePersonalStorage(false), true);
});
