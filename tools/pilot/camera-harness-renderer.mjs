import { applyGuidedCameraEvent, createGuidedCameraSummary } from "../../dist/camera/guided-validation.js";

const consent = document.querySelector("#consent");
const start = document.querySelector("#start");
const stop = document.querySelector("#stop");
const calibrate = document.querySelector("#calibrate");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const summaryView = document.querySelector("#summary");
let summary = createGuidedCameraSummary();
let stream = null;

function render(message) { status.textContent = message; summaryView.textContent = JSON.stringify(summary, null, 2); }
function releaseTracks() { for (const track of stream?.getTracks() ?? []) track.stop(); stream = null; preview.srcObject = null; stop.disabled = true; calibrate.disabled = true; }
function classify(error) { const name = error instanceof DOMException ? error.name : "UnknownError"; return name === "NotAllowedError" ? "DENY" : name === "NotFoundError" ? "UNAVAILABLE" : name === "NotReadableError" ? "BUSY" : "UNAVAILABLE"; }

start.addEventListener("click", async () => {
  if (!consent.checked) { render("Cần consent rõ ràng trước khi mở camera."); return; }
  try {
    summary = applyGuidedCameraEvent(summary, "GRANT_CONSENT");
    summary = applyGuidedCameraEvent(summary, "REQUEST_START");
    start.disabled = true;
    consent.disabled = true;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } });
    const track = stream.getVideoTracks()[0];
    if (!track) throw new DOMException("Không có video track", "NotFoundError");
    track.addEventListener("ended", () => { releaseTracks(); if (["ACTIVE", "CALIBRATED"].includes(summary.state)) summary = applyGuidedCameraEvent(summary, "DISCONNECT"); render("Camera đã ngắt; fallback an toàn, accuracy không được đánh giá."); }, { once: true });
    preview.srcObject = stream;
    await preview.play();
    const settings = track.getSettings();
    const qualityOk = (settings.width ?? 0) >= 320 && (settings.height ?? 0) >= 240 && track.readyState === "live";
    summary = applyGuidedCameraEvent(summary, "STARTED");
    if (!qualityOk) summary = applyGuidedCameraEvent(summary, "REJECT_QUALITY");
    stop.disabled = false;
    calibrate.disabled = !qualityOk;
    render(qualityOk ? "Camera active; quality lifecycle tối thiểu đạt. Hãy căn khung và xác nhận thủ công." : "Quality không đủ; không tạo measurement.");
  } catch (error) {
    releaseTracks();
    summary = applyGuidedCameraEvent(summary, classify(error));
    render(`Camera không khả dụng (${summary.state}); survey-only/timer-only vẫn dùng được.`);
  } finally { start.disabled = summary.state !== "IDLE"; }
});

calibrate.addEventListener("click", () => { summary = applyGuidedCameraEvent(summary, "CONFIRM_CALIBRATION"); calibrate.disabled = true; render("Calibration được operator xác nhận; accuracy vẫn NOT_EVALUATED."); });
stop.addEventListener("click", () => { releaseTracks(); if (summary.state !== "STOPPED") summary = applyGuidedCameraEvent(summary, "STOP"); render("Camera đã dừng và mọi track đã được giải phóng."); });
window.addEventListener("beforeunload", releaseTracks);
render("Chưa bắt đầu.");
