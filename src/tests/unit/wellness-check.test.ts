import assert from "node:assert/strict";
import test from "node:test";
import {
  WELLNESS_DISCLAIMER,
  WELLNESS_MAXIMUM_SCORE,
  WELLNESS_QUESTIONNAIRE_ID,
  WELLNESS_QUESTIONNAIRE_VERSION,
  WELLNESS_SCORE_VERSION,
  createWellnessCheckReport,
  scoreEyeMateSymptomCheck,
  wellnessQuestions,
  type WellnessQuestionId,
  type WellnessResponse
} from "../../symptom-checkup/wellness-check.js";

const all = (value: WellnessResponse): Record<WellnessQuestionId, WellnessResponse> => Object.fromEntries(wellnessQuestions.map((question) => [question.id, value])) as Record<WellnessQuestionId, WellnessResponse>;

test("EyeMate Symptom Check có đúng năm câu, wording và thang 0-3 đã được owner duyệt", () => {
  assert.equal(WELLNESS_QUESTIONNAIRE_ID, "eyemate-symptom-check");
  assert.equal(WELLNESS_QUESTIONNAIRE_VERSION, "eyemate-symptom-check/1.0.0");
  assert.equal(WELLNESS_SCORE_VERSION, "eyemate-symptom-check-total/1.0.0");
  assert.equal(WELLNESS_MAXIMUM_SCORE, 15);
  assert.deepEqual(wellnessQuestions.map((question) => question.wording), [
    "Cảm giác khô, rát hoặc khó chịu ở mắt",
    "Mắt mỏi sau khi nhìn màn hình một lúc",
    "Mắt bị mờ thoáng qua rồi tự hết",
    "Mắt nhạy cảm hơn với ánh sáng bình thường",
    "Phải cố gắng nhiều hơn để nhìn rõ cuối ngày"
  ]);
  for (const question of wellnessQuestions) assert.deepEqual(question.responseScale, ["Không", "Đôi khi", "Thường xuyên", "Hầu như luôn luôn"]);
});

test("tổng điểm giữ đúng miền 0-15 và ba nhóm hành động phi lâm sàng", () => {
  const low = scoreEyeMateSymptomCheck(all(0));
  const middle = scoreEyeMateSymptomCheck(all(1));
  const high = scoreEyeMateSymptomCheck(all(3));
  assert.deepEqual([low.score, low.actionGroup, low.label], [0, "MAINTAIN_ROUTINE", "Duy trì thói quen hỗ trợ"]);
  assert.deepEqual([middle.score, middle.actionGroup, middle.label], [5, "ADD_SUPPORT", "Thêm nhịp nghỉ và điều chỉnh"]);
  assert.deepEqual([high.score, high.actionGroup, high.label], [15, "PAUSE_AND_RECHECK", "Ưu tiên nghỉ và theo dõi lại"]);
  assert.equal(high.maximumScore, 15);
});

test("ranh giới nhóm là 0-4, 5-9 và 10-15", () => {
  assert.equal(scoreEyeMateSymptomCheck({ ...all(0), eye_discomfort: 3, screen_fatigue: 1 }).actionGroup, "MAINTAIN_ROUTINE");
  assert.equal(scoreEyeMateSymptomCheck({ ...all(1), eye_discomfort: 3, screen_fatigue: 2 }).actionGroup, "ADD_SUPPORT");
  assert.equal(scoreEyeMateSymptomCheck({ ...all(2) }).actionGroup, "PAUSE_AND_RECHECK");
});

test("UNKNOWN làm kết quả INSUFFICIENT_DATA, không thay bằng điểm 0", () => {
  const answers = all(2);
  answers.temporary_blur = "UNKNOWN";
  const score = scoreEyeMateSymptomCheck(answers);
  assert.equal(score.state, "INSUFFICIENT_DATA");
  assert.equal(score.score, null);
  assert.equal(score.actionGroup, null);
  assert.deepEqual(score.missingItemIds, ["temporary_blur"]);
});

test("giá trị ngoài scale 0-3 bị từ chối", () => {
  assert.throws(() => scoreEyeMateSymptomCheck({ ...all(0), eye_discomfort: 4 as WellnessResponse }), /INVALID_WELLNESS_RESPONSE/);
});

test("report luôn mang disclaimer và action group không dùng severity lâm sàng", () => {
  const report = createWellnessCheckReport(all(2), "CONTINUE_SELF_CHECK");
  assert.equal(report.disclaimer, WELLNESS_DISCLAIMER);
  assert.equal(report.discomfortLoad.actionGroup, "PAUSE_AND_RECHECK");
  assert.equal("severity" in report.discomfortLoad, false);
  assert.doesNotMatch(JSON.stringify(report), /DEQ-5|OSDI|\b(normal|mild|moderate|severe)\b/i);
  assert.deepEqual(report.actions.map((action) => action.id), ["LOOK_AWAY_BREAK", "ADJUST_SCREEN_SETUP", "RECHECK_AFTER_REST"]);
  assert.equal(report.limitation, "SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT");
});

test("Safety Gate vẫn được ưu tiên và hành động có nguồn evidence", () => {
  const report = createWellnessCheckReport(all(3), "STOP_WITH_PROFESSIONAL_GUIDANCE");
  assert.equal(report.status, "SAFETY_STOP");
  assert.deepEqual(report.actions, [{ id: "CONSIDER_PROFESSIONAL_GUIDANCE", reasonCode: "SAFETY_GATE_STOP", evidenceSource: "SAFETY_GATE" }]);
});
