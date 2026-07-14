import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EYEMATE_APPLICATION_VERSION } from "../../shared/product-meta.js";

test("phiên bản hiển thị khớp package version", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version?: unknown };
  assert.equal(EYEMATE_APPLICATION_VERSION, packageJson.version);
});
