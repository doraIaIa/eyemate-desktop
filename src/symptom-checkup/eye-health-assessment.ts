import type { CameraMeasurementAggregate } from "../camera/measurement-window.js";
import type { WellnessAction, WellnessCheckReport } from "./wellness-check.js";

export const EYE_HEALTH_ASSESSMENT_VERSION = "eyemate-eye-wellness-assessment/0.1.0" as const;

export type EyeHealthAssessmentDimension =
  | "SELF_REPORTED_COMFORT"
  | "BLINK_BEHAVIOR"
  | "VIEWING_DISTANCE"
  | "VISUAL_WORKLOAD"
  | "DATA_CONFIDENCE";

export type EyeHealthSignal = "SUPPORTIVE" | "WATCH" | "ADJUST" | "PAUSE_AND_RECHECK" | "MISSING";
export type EyeHealthConfidence = "HIGH" | "MEDIUM" | "LOW" | "MISSING";

export interface CheckupCameraEvidence {
  readonly status: "NOT_MEASURED" | CameraMeasurementAggregate["status"];
  readonly sampleCount: number;
  readonly validSampleCount: number;
  readonly validSampleRatio: number;
  readonly confidence: number;
  readonly blinkRatePerMinute: number | null;
  readonly distanceZone: "NEAR" | "COMFORT" | "FAR" | "UNKNOWN";
  readonly reasonCodes: readonly string[];
  readonly algorithmVersion: string | null;
  readonly configVersion: string | null;
  readonly rawDataPersisted: false;
}

export interface EyeHealthAssessmentRow {
  readonly dimension: EyeHealthAssessmentDimension;
  readonly observation: string;
  readonly evidence: string;
  readonly signal: EyeHealthSignal;
  readonly confidence: EyeHealthConfidence;
  readonly action: string;
  readonly limitation: string;
}

export interface EyeHealthAssessment {
  readonly version: typeof EYE_HEALTH_ASSESSMENT_VERSION;
  readonly overallSignal: EyeHealthSignal;
  readonly overallLabel: string;
  readonly dataConfidence: number;
  readonly rows: readonly EyeHealthAssessmentRow[];
  readonly missingEvidence: readonly string[];
  readonly sourceBasis: readonly ("NEI_DRY_EYE_OVERVIEW" | "AOA_DIGITAL_EYE_STRAIN" | "AAO_DIGITAL_EYE_STRAIN")[];
  readonly disclaimer: "WELLNESS_EDUCATION_NOT_DIAGNOSIS";
}

function confidenceFromRatio(ratio: number): EyeHealthConfidence {
  if (ratio >= 0.8) return "HIGH";
  if (ratio >= 0.7) return "MEDIUM";
  if (ratio > 0) return "LOW";
  return "MISSING";
}

function scoreSignal(score: number | null): EyeHealthSignal {
  if (score === null) return "MISSING";
  if (score <= 4) return "SUPPORTIVE";
  if (score <= 9) return "ADJUST";
  return "PAUSE_AND_RECHECK";
}

function blinkSignal(rate: number | null): EyeHealthSignal {
  if (rate === null) return "MISSING";
  if (rate < 8) return "ADJUST";
  if (rate > 35) return "WATCH";
  return "SUPPORTIVE";
}

function distanceSignal(zone: CheckupCameraEvidence["distanceZone"]): EyeHealthSignal {
  if (zone === "UNKNOWN") return "MISSING";
  if (zone === "COMFORT") return "SUPPORTIVE";
  return "ADJUST";
}

function cameraQualityEvidence(camera: CheckupCameraEvidence): string {
  if (camera.status === "NOT_MEASURED") return "Camera chưa được dùng trong lần checkup này.";
  if (camera.status !== "COMPLETED") return "Camera chưa tạo đủ dữ liệu quan sát ổn định.";
  return `${Math.round(camera.validSampleRatio * 100)}% thời lượng camera đủ chất lượng; xử lý cục bộ và không lưu hình ảnh.`;
}

function blinkObservation(rate: number | null): string {
  if (rate === null) return "Chưa có đủ dữ liệu camera để ước tính nhịp chớp mắt.";
  if (rate === 0) return "Chưa nhận diện được lần chớp mắt rõ ràng trong cửa sổ đo 30 giây.";
  return `Ước tính khoảng ${rate}/phút trong cửa sổ đo camera 30 giây.`;
}

function distanceObservation(zone: CheckupCameraEvidence["distanceZone"]): string {
  if (zone === "COMFORT") return "Khoảng cách đang ở vùng phù hợp với mốc hiệu chỉnh cá nhân.";
  if (zone === "NEAR") return "Khoảng cách có xu hướng gần hơn mốc hiệu chỉnh cá nhân.";
  if (zone === "FAR") return "Khoảng cách xa hơn mốc hiệu chỉnh cá nhân.";
  return "Chưa đủ dữ liệu camera để phân loại khoảng cách nhìn.";
}

function strongest(signals: readonly EyeHealthSignal[]): EyeHealthSignal {
  if (signals.includes("PAUSE_AND_RECHECK")) return "PAUSE_AND_RECHECK";
  if (signals.includes("ADJUST")) return "ADJUST";
  if (signals.includes("WATCH")) return "WATCH";
  if (signals.includes("SUPPORTIVE")) return "SUPPORTIVE";
  return "MISSING";
}

export function cameraEvidenceFromAggregate(aggregate: CameraMeasurementAggregate | null | undefined): CheckupCameraEvidence {
  if (!aggregate) {
    return Object.freeze({
      status: "NOT_MEASURED",
      sampleCount: 0,
      validSampleCount: 0,
      validSampleRatio: 0,
      confidence: 0,
      blinkRatePerMinute: null,
      distanceZone: "UNKNOWN",
      reasonCodes: Object.freeze(["CAMERA_NOT_MEASURED"]),
      algorithmVersion: null,
      configVersion: null,
      rawDataPersisted: false
    });
  }
  return Object.freeze({
    status: aggregate.status,
    sampleCount: aggregate.sampleCount,
    validSampleCount: aggregate.validSampleCount,
    validSampleRatio: aggregate.validSampleRatio,
    confidence: aggregate.confidence,
    blinkRatePerMinute: aggregate.blinkSummary.status === "OBSERVED" ? aggregate.blinkSummary.ratePerMinute : null,
    distanceZone: aggregate.distanceSummary.status === "OBSERVED" ? aggregate.distanceSummary.dominantZone : "UNKNOWN",
    reasonCodes: Object.freeze([...aggregate.reasonCodes]),
    algorithmVersion: aggregate.algorithmVersion,
    configVersion: aggregate.configVersion,
    rawDataPersisted: false
  });
}

export function actionsWithCameraEvidence(actions: readonly WellnessAction[], camera: CheckupCameraEvidence): readonly WellnessAction[] {
  const next = [...actions];
  if (camera.blinkRatePerMinute !== null && camera.blinkRatePerMinute < 8 && !next.some((action) => action.id === "CONSCIOUS_BLINK")) {
    next.push({ id: "CONSCIOUS_BLINK", reasonCode: "LOW_BLINK_OBSERVATION_WINDOW", evidenceSource: "CAMERA_OBSERVATION" });
  }
  if (camera.distanceZone === "NEAR" && !next.some((action) => action.id === "ADJUST_SCREEN_SETUP")) {
    next.push({ id: "ADJUST_SCREEN_SETUP", reasonCode: "NEAR_VIEWING_DISTANCE_OBSERVED", evidenceSource: "CAMERA_OBSERVATION" });
  }
  return Object.freeze(next);
}

export function buildEyeHealthAssessment(report: WellnessCheckReport, camera: CheckupCameraEvidence): EyeHealthAssessment {
  const symptomSignal = scoreSignal(report.discomfortLoad.score);
  const blink = blinkSignal(camera.blinkRatePerMinute);
  const distance = distanceSignal(camera.distanceZone);
  const cameraConfidence = confidenceFromRatio(camera.validSampleRatio);
  const rows: EyeHealthAssessmentRow[] = [
    {
      dimension: "SELF_REPORTED_COMFORT",
      observation: report.discomfortLoad.score === null ? "Chưa đủ câu trả lời tự báo cáo để tính tổng điểm." : `${report.discomfortLoad.score}/${report.discomfortLoad.maximumScore} trong 7 ngày gần đây.`,
      evidence: `Questionnaire ${report.provenance.questionnaireVersion}; ${report.discomfortLoad.answeredItemCount}/5 câu có dữ liệu.`,
      signal: symptomSignal,
      confidence: report.discomfortLoad.score === null ? "MISSING" : "HIGH",
      action: report.discomfortLoad.label,
      limitation: "Điểm này là wellness self-report, không phải thang đo lâm sàng đã validation."
    },
    {
      dimension: "BLINK_BEHAVIOR",
      observation: blinkObservation(camera.blinkRatePerMinute),
      evidence: cameraQualityEvidence(camera),
      signal: blink,
      confidence: cameraConfidence,
      action: blink === "ADJUST" ? "Thêm nhắc chớp mắt chủ động và nghỉ nhìn xa ngắn." : "Tiếp tục theo dõi ở các lần đo sau.",
      limitation: "Blink rate là quan sát hành vi trong một cửa sổ ngắn, không xác định nguyên nhân khô mắt."
    },
    {
      dimension: "VIEWING_DISTANCE",
      observation: distanceObservation(camera.distanceZone),
      evidence: cameraQualityEvidence(camera),
      signal: distance,
      confidence: cameraConfidence,
      action: distance === "ADJUST" ? "Kiểm tra lại vị trí màn hình/webcam và giảm phiên nhìn gần liên tục." : "Duy trì khoảng cách làm việc hiện tại nếu thấy thoải mái.",
      limitation: "EyeMate chỉ phân loại zone theo calibration cá nhân, không công bố khoảng cách centimet đo được."
    },
    {
      dimension: "VISUAL_WORKLOAD",
      observation: report.discomfortLoad.actionGroup === "PAUSE_AND_RECHECK" || distance === "ADJUST" || blink === "ADJUST" ? "Có tín hiệu nên giảm tải thị giác trong ngắn hạn." : "Chưa thấy tín hiệu đủ mạnh để tăng mức can thiệp.",
      evidence: "Kết hợp self-report, blink observation và distance zone khi có dữ liệu.",
      signal: strongest([symptomSignal, blink, distance]),
      confidence: camera.status === "COMPLETED" && report.discomfortLoad.score !== null ? "MEDIUM" : report.discomfortLoad.score !== null ? "LOW" : "MISSING",
      action: "Ưu tiên nghỉ nhìn xa, ánh sáng ổn định, vị trí màn hình phù hợp và theo dõi lại sau nghỉ.",
      limitation: "Không hợp nhất thành chẩn đoán bệnh; missing data không được tính như bình thường."
    },
    {
      dimension: "DATA_CONFIDENCE",
      observation: `Độ phủ dữ liệu tổng hợp ${Math.round(((report.discomfortLoad.score === null ? 0 : 0.5) + Math.min(0.5, camera.confidence * 0.5)) * 100)}%.`,
      evidence: `Tự báo cáo ${report.discomfortLoad.answeredItemCount}/5 câu; camera đủ chất lượng ${Math.round(camera.validSampleRatio * 100)}%.`,
      signal: camera.status === "INSUFFICIENT_DATA" || report.discomfortLoad.score === null ? "MISSING" : "SUPPORTIVE",
      confidence: report.discomfortLoad.score !== null && camera.status === "COMPLETED" ? "MEDIUM" : "LOW",
      action: "Nếu dữ liệu thiếu, đo lại trong điều kiện ánh sáng ổn định và một khuôn mặt trong khung hình.",
      limitation: "Một lần checkup không đủ để kết luận xu hướng dài hạn."
    }
  ];
  const overallSignal = strongest(rows.map((row) => row.signal));
  const labels: Record<EyeHealthSignal, string> = {
    SUPPORTIVE: "Duy trì thói quen hỗ trợ mắt",
    WATCH: "Theo dõi thêm ở lần đo kế tiếp",
    ADJUST: "Nên điều chỉnh môi trường và nhịp nghỉ",
    PAUSE_AND_RECHECK: "Ưu tiên nghỉ, điều chỉnh và theo dõi lại",
    MISSING: "Chưa đủ dữ liệu để đánh giá"
  };
  const dataConfidence = Math.round(((report.discomfortLoad.score === null ? 0 : 0.5) + Math.min(0.5, camera.confidence * 0.5)) * 100) / 100;
  const missingEvidence = rows.filter((row) => row.signal === "MISSING").map((row) => row.dimension);
  return Object.freeze({
    version: EYE_HEALTH_ASSESSMENT_VERSION,
    overallSignal,
    overallLabel: labels[overallSignal],
    dataConfidence,
    rows: Object.freeze(rows),
    missingEvidence: Object.freeze(missingEvidence),
    sourceBasis: Object.freeze(["NEI_DRY_EYE_OVERVIEW", "AOA_DIGITAL_EYE_STRAIN", "AAO_DIGITAL_EYE_STRAIN"] as const),
    disclaimer: "WELLNESS_EDUCATION_NOT_DIAGNOSIS"
  });
}
