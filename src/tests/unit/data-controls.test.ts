import assert from "node:assert/strict";
import test from "node:test";
import { createSurveyOnlyExportPreview, resolveDeletionResult } from "../../user-data/data-controls.js";

test("export chỉ có preview cục bộ trước destination confirmation", () => {
  const preview = createSurveyOnlyExportPreview();
  assert.equal(preview.requiresDestinationConfirmation, true);
  assert.equal(preview.disclaimer, "NOT_A_DIAGNOSIS");
});
test("deletion báo kết quả trung thực", () => {
  assert.equal(resolveDeletionResult(2, 0), "DELETED");
  assert.equal(resolveDeletionResult(1, 1), "PARTIALLY_DELETED");
  assert.equal(resolveDeletionResult(0, 1), "FAILED");
});
