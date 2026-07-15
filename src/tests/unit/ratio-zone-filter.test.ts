import assert from "node:assert/strict";
import test from "node:test";
import { DISTANCE_RATIO_FILTER_CONFIG, RatioZoneFilter } from "../../distance/ratio-zone-filter.js";

test("median filter cần ba readings trước khi công bố zone", () => {
  const filter = new RatioZoneFilter(100);
  assert.equal(filter.push(100).zone, null);
  assert.equal(filter.push(101).zone, null);
  const stable = filter.push(99);
  assert.equal(stable.status, "OBSERVED");
  assert.equal(stable.zone, "COMFORT");
});

test("spike bị loại và không tái sử dụng median cũ như observation mới", () => {
  const filter = new RatioZoneFilter(100);
  filter.push(100); filter.push(101); filter.push(99);
  const spike = filter.push(40);
  assert.deepEqual(spike, { status: "OUTLIER_REJECTED", zone: null, filteredInterEyeDistancePx: null });
  assert.equal(filter.push(100).zone, null);
  assert.equal(filter.push(100).zone, null);
  assert.equal(filter.push(100).zone, "COMFORT");
});

test("UNKNOWN ngắt dwell và cần ba readings mới xác nhận lại zone", () => {
  const filter = new RatioZoneFilter(100);
  filter.push(100); filter.push(100); filter.push(100);
  assert.equal(filter.reject().zone, null);
  assert.equal(filter.push(100).zone, null);
  assert.equal(filter.push(100).zone, null);
  assert.equal(filter.push(100).zone, "COMFORT");
});

test("hysteresis giữ zone NEAR khi dao động sát biên thoát", () => {
  const filter = new RatioZoneFilter(100);
  filter.push(120); filter.push(120); filter.push(120);
  assert.equal(filter.push(110).zone, "NEAR");
  assert.equal(filter.push(110).zone, "NEAR");
  assert.equal(filter.push(110).zone, "NEAR");
});

test("input invalid fail-closed và config có version", () => {
  const filter = new RatioZoneFilter(100);
  assert.equal(filter.push(Number.NaN).status, "OUTLIER_REJECTED");
  assert.match(DISTANCE_RATIO_FILTER_CONFIG.version, /^distance-ratio-filter\/\d+\.\d+\.\d+$/);
  assert.throws(() => new RatioZoneFilter(0), /INVALID_DISTANCE_RATIO_REFERENCE/);
});
