import assert from "node:assert/strict";
import test from "node:test";
import { createEnterpriseDemoModel, enterpriseMetricDefinitions, validateEnterpriseDemoBoundary } from "../../enterprise-demo/enterprise-demo-data.js";
import { ENTERPRISE_DEMO_HASH, isEnterpriseDemoMode, shouldInitializePersonalStorage } from "../../main/enterprise-demo-mode.js";

test("enterprise demo mặc định synthetic, offline và đóng góp aggregate OFF", () => {
  const model = createEnterpriseDemoModel();
  assert.equal(model.policy.syntheticDataOnly, true);
  assert.equal(model.policy.defaultAggregateParticipation, false);
  assert.equal(model.policy.networkAllowed, false);
  assert.deepEqual(validateEnterpriseDemoBoundary(model), []);
});

test("metric được tính từ numerator/denominator và có metadata giải thích", () => {
  const model = createEnterpriseDemoModel();
  const enrollment = model.metrics.find((metric) => metric.id === "enrollment-coverage");
  assert.ok(enrollment);
  assert.equal(enrollment.numerator, 205);
  assert.equal(enrollment.denominator, 247);
  assert.equal(enrollment.value, 83);
  assert.equal(enrollment.deltaPoints, 6.1);
  assert.equal(enrollment.coverage, 94);
  assert.equal(enrollment.series.length, 6);
  assert.match(enrollment.metricVersion, /proposed/);
  assert.notEqual(enrollment.definition.prohibitedInterpretation, "");
});

test("color registry giữ một token duy nhất cho mỗi metric", () => {
  const model = createEnterpriseDemoModel();
  for (const metric of model.metrics) {
    assert.equal(metric.definition.colorToken, enterpriseMetricDefinitions[metric.id].colorToken);
    assert.equal(model.trendSeries.find((series) => series.metricId === metric.id)?.colorToken, metric.definition.colorToken);
  }
});

test("cohort Legal bị suppression từ selector và không mang giá trị nhạy cảm", () => {
  const legal = createEnterpriseDemoModel().cohorts.find((cohort) => cohort.id === "legal");
  assert.ok(legal);
  assert.equal(legal.privacyState, "SUPPRESSED");
  assert.equal(legal.eligible, null);
  assert.equal(legal.contributors, null);
  assert.equal(legal.participation, null);
});

test("enterprise demo không tạo metric focus, fatigue, productivity hoặc health score", () => {
  const model = createEnterpriseDemoModel();
  const metricText = model.metrics.map((metric) => `${metric.id} ${metric.definition.label}`).join(" ").toLowerCase();
  assert.equal(/focus score|fatigue score|productivity score|health score/.test(metricText), false);
});

test("report có tên chính xác và campaign chỉ tham chiếu metric đã định nghĩa", () => {
  const model = createEnterpriseDemoModel();
  assert.ok(model.reports.every((report) => report.name === "EyeMate Program Implementation & Participation Report"));
  for (const campaign of model.campaigns) for (const metricId of campaign.aggregateMetrics) assert.ok(enterpriseMetricDefinitions[metricId]);
});

test("enterprise demo khóa các năng lực employer bị cấm", () => {
  const model = createEnterpriseDemoModel();
  assert.equal(model.policy.cameraCoercionAllowed, false);
  assert.equal(model.policy.managerDrillDownAllowed, false);
  assert.equal(model.policy.identityInsightsJoinAllowed, false);
  assert.equal(model.policy.realtimePresenceAllowed, false);
  assert.ok(model.forbiddenEmployerFeatures.some((item) => item.includes("camera")));
  assert.ok(model.forbiddenEmployerFeatures.some((item) => item.includes("drill-down")));
});

test("enterprise demo mode không khởi tạo personal storage", () => {
  assert.equal(ENTERPRISE_DEMO_HASH, "enterprise-demo/overview");
  assert.equal(isEnterpriseDemoMode(["electron", "main.js", "--enterprise-demo"], {}), true);
  assert.equal(isEnterpriseDemoMode(["electron", "main.js"], { EYEMATE_ENTERPRISE_DEMO: "1" }), true);
  assert.equal(shouldInitializePersonalStorage(true), false);
  assert.equal(shouldInitializePersonalStorage(false), true);
});
