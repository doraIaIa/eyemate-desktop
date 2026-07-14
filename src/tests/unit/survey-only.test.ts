import assert from "node:assert/strict";
import test from "node:test";
import { cancelCheckup, createSurveyDraft, createSurveyOnlyReport, recordSurveyAnswer, recoverInterruptedCheckup } from "../../symptom-checkup/survey-only.js";

test("survey-only hoàn tất giữ camera NOT_MEASURED và provenance", () => {
  let draft = recordSurveyAnswer(createSurveyDraft(), "comfort_now", "NOTICEABLE");
  draft = recordSurveyAnswer(draft, "screen_interruption", "MILD");
  const report = createSurveyOnlyReport(draft, "CONTINUE_SELF_CHECK");
  assert.equal(report.status, "COMPLETED"); assert.equal(report.coverage.camera, "NOT_MEASURED"); assert.equal(report.provenance.questionnaireVersion, "m1-synthetic-0.1.0");
});
test("dữ liệu thiếu không được điền giá trị mặc định", () => {
  const report = createSurveyOnlyReport(recordSurveyAnswer(createSurveyDraft(), "comfort_now", "NOTICEABLE"), "CONTINUE_SELF_CHECK");
  assert.equal(report.status, "INSUFFICIENT_DATA"); assert.deepEqual(report.missingData, ["screen_interruption"]);
});
test("cancel và recovery không tự hoàn tất checkup", () => {
  assert.equal(cancelCheckup(createSurveyDraft()).state, "CANCELLED"); assert.equal(recoverInterruptedCheckup(recordSurveyAnswer(createSurveyDraft(), "comfort_now", "MILD")).state, "PARTIAL");
});
test("Safety Gate dừng report survey-only trước khi suy diễn", () => {
  const report = createSurveyOnlyReport(createSurveyDraft(), "STOP_WITH_PROFESSIONAL_GUIDANCE"); assert.equal(report.status, "SAFETY_STOP"); assert.equal(report.pattern, "NOT_AVAILABLE");
});
