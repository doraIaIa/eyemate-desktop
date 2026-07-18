import type { CameraFrameObservation } from "../camera/measurement-window.js";

export type CameraRuntimeState = "IDLE" | "STARTING" | "ACTIVE" | "DENIED" | "UNAVAILABLE" | "BUSY" | "DISCONNECTED" | "DEVICE_CHANGED" | "FAILED" | "STOPPED";

export interface CameraRuntimeContext {
  readonly deviceBinding: string;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

export interface CameraRuntimeCallbacks {
  readonly onState: (state: CameraRuntimeState, reason: string) => void;
  readonly onObservation: (observation: CameraFrameObservation) => void;
}

interface Landmark { readonly x: number; readonly y: number; readonly z?: number; }
interface BlendshapeCategory { readonly categoryName: string; readonly score: number; }
interface FaceResult {
  readonly faceLandmarks: readonly (readonly Landmark[])[];
  readonly faceBlendshapes: readonly { readonly categories: readonly BlendshapeCategory[] }[];
}
interface FaceLandmarkerInstance { detectForVideo(video: HTMLVideoElement, timestampMs: number): FaceResult; close(): void; }
interface VisionModule {
  readonly FilesetResolver: { forVisionTasks(basePath: string): Promise<unknown> };
  readonly FaceLandmarker: { createFromOptions(fileset: unknown, options: unknown): Promise<FaceLandmarkerInstance> };
}

function distance(left: Landmark, right: Landmark): number { return Math.hypot(left.x - right.x, left.y - right.y); }
function eyeAspectRatio(points: readonly Landmark[], indices: readonly [number, number, number, number, number, number]): number | null {
  const [p1, p2, p3, p4, p5, p6] = indices.map((index) => points[index]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return null;
  const horizontal = distance(p1, p4);
  return horizontal <= 0 ? null : (distance(p2, p6) + distance(p3, p5)) / (2 * horizontal);
}

function poseScore(points: readonly Landmark[]): number {
  const nose = points[1]; const left = points[234]; const right = points[454];
  if (!nose || !left || !right) return 0;
  const span = Math.abs(right.x - left.x);
  if (span <= 0) return 0;
  const center = (left.x + right.x) / 2;
  return Math.max(0, Math.min(1, 1 - Math.abs(nose.x - center) / (span * 0.35)));
}

function blendshapeScore(result: FaceResult, categoryName: "eyeBlinkLeft" | "eyeBlinkRight"): number | null {
  const category = result.faceBlendshapes[0]?.categories.find((candidate) => candidate.categoryName === categoryName);
  return category && Number.isFinite(category.score) ? category.score : null;
}

async function deviceBinding(deviceId: string, width: number, height: number): Promise<string> {
  const bytes = new TextEncoder().encode(`${deviceId}|${width}x${height}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function classifyStartFailure(error: unknown): { readonly state: CameraRuntimeState; readonly reason: string } {
  const name = error instanceof DOMException ? error.name : "UNKNOWN";
  if (name === "NotAllowedError" || name === "SecurityError") return { state: "DENIED", reason: "CAMERA_PERMISSION_DENIED" };
  if (name === "NotFoundError" || name === "OverconstrainedError") return { state: "UNAVAILABLE", reason: "CAMERA_UNAVAILABLE" };
  if (name === "NotReadableError" || name === "AbortError") return { state: "BUSY", reason: "CAMERA_BUSY" };
  return { state: "FAILED", reason: "CAMERA_RUNTIME_FAILED" };
}

export class LocalCameraRuntime {
  readonly #callbacks: CameraRuntimeCallbacks;
  #stream: MediaStream | null = null;
  #landmarker: FaceLandmarkerInstance | null = null;
  #animationFrame: number | null = null;
  #videoFrameCallback: number | null = null;
  #video: HTMLVideoElement | null = null;
  #context: CameraRuntimeContext | null = null;
  #stopping = false;
  #canvas = new OffscreenCanvas(32, 24);
  #landmarkOverlayEnabled = false;
  #landmarkOverlayCanvas: HTMLCanvasElement | null = null;

  constructor(callbacks: CameraRuntimeCallbacks) { this.#callbacks = callbacks; }

  get context(): CameraRuntimeContext | null { return this.#context; }
  get active(): boolean { return this.#stream !== null; }

  setLandmarkOverlayEnabled(enabled: boolean): void {
    this.#landmarkOverlayEnabled = enabled;
    if (!enabled) { this.#landmarkOverlayCanvas?.remove(); this.#landmarkOverlayCanvas = null; }
  }

  async enumerateDevices(): Promise<readonly { readonly deviceId: string; readonly label: string }[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
    return devices.map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Camera ${index + 1}` }));
  }

  async attachPreview(video: HTMLVideoElement): Promise<boolean> {
    if (!this.#stream || !this.#landmarker) return false;
    if (this.#video === video) return true;
    if (this.#animationFrame !== null) cancelAnimationFrame(this.#animationFrame);
    if (this.#videoFrameCallback !== null && this.#video) this.#video.cancelVideoFrameCallback(this.#videoFrameCallback);
    this.#animationFrame = null;
    this.#videoFrameCallback = null;
    if (this.#video) this.#video.srcObject = null;
    this.#video = video;
    video.srcObject = this.#stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    this.#scheduleFrame();
    return true;
  }

  async start(video: HTMLVideoElement, selectedDeviceId?: string): Promise<CameraRuntimeContext | null> {
    await this.stop();
    if (!navigator.mediaDevices?.getUserMedia) { this.#callbacks.onState("UNAVAILABLE", "CAMERA_API_UNAVAILABLE"); return null; }
    this.#callbacks.onState("STARTING", "CAMERA_STARTING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } });
      this.#stream = stream;
      this.#video = video;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      const track = stream.getVideoTracks()[0];
      if (!track) throw new DOMException("Camera track missing", "NotFoundError");
      const settings = track.getSettings();
      const width = settings.width ?? video.videoWidth;
      const height = settings.height ?? video.videoHeight;
      this.#context = { deviceBinding: await deviceBinding(settings.deviceId ?? selectedDeviceId ?? "default", width, height), width, height, label: track.label || "Camera" };
      track.addEventListener("ended", () => { if (!this.#stopping) { void this.stop(); this.#callbacks.onState("DISCONNECTED", "CAMERA_DISCONNECTED"); } }, { once: true });
      navigator.mediaDevices.addEventListener("devicechange", this.#onDeviceChange, { once: true });
      const modulePath = "./vendor/vision_bundle.mjs";
      const vision = await import(modulePath) as VisionModule;
      const fileset = await vision.FilesetResolver.forVisionTasks(new URL("./vendor/wasm", import.meta.url).href);
      this.#landmarker = await vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: new URL("./models/face_landmarker.task", import.meta.url).href }, runningMode: "VIDEO", numFaces: 2, minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: false });
      this.#callbacks.onState("ACTIVE", "CAMERA_ACTIVE");
      this.#scheduleFrame();
      return this.#context;
    } catch (error) {
      const failure = classifyStartFailure(error);
      await this.stop();
      this.#callbacks.onState(failure.state, failure.reason);
      return null;
    }
  }

  async stop(): Promise<void> {
    this.#stopping = true;
    if (this.#animationFrame !== null) cancelAnimationFrame(this.#animationFrame);
    if (this.#videoFrameCallback !== null && this.#video) this.#video.cancelVideoFrameCallback(this.#videoFrameCallback);
    this.#animationFrame = null;
    this.#videoFrameCallback = null;
    this.#landmarker?.close();
    this.#landmarker = null;
    for (const track of this.#stream?.getTracks() ?? []) track.stop();
    this.#stream = null;
    if (this.#video) this.#video.srcObject = null;
    this.#landmarkOverlayCanvas?.remove();
    this.#landmarkOverlayCanvas = null;
    this.#video = null;
    this.#context = null;
    navigator.mediaDevices?.removeEventListener("devicechange", this.#onDeviceChange);
    this.#stopping = false;
  }

  readonly #onDeviceChange = (): void => { void this.stop(); this.#callbacks.onState("DEVICE_CHANGED", "CAMERA_DEVICE_CHANGED"); };

  #scheduleFrame(): void {
    const processFrame = (timestampMs: number): void => {
      this.#animationFrame = null;
      this.#videoFrameCallback = null;
      if (!this.#video || !this.#landmarker || !this.#stream) return;
      try { this.#emitObservation(this.#landmarker.detectForVideo(this.#video, timestampMs)); }
      catch { this.#callbacks.onState("FAILED", "CAMERA_INFERENCE_FAILED"); void this.stop(); return; }
      this.#scheduleFrame();
    };
    if (!this.#video) return;
    if (typeof this.#video.requestVideoFrameCallback === "function") {
      this.#videoFrameCallback = this.#video.requestVideoFrameCallback((timestampMs) => processFrame(timestampMs));
    } else {
      this.#animationFrame = requestAnimationFrame((timestampMs) => processFrame(timestampMs));
    }
  }

  #emitObservation(result: FaceResult): void {
    const points = result.faceLandmarks[0];
    if (points && this.#video && this.#landmarkOverlayEnabled) this.#drawLandmarkOverlay(points);
    let lightingScore = 0;
    if (this.#video) {
      const context = this.#canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(this.#video, 0, 0, 32, 24);
        const pixels = context.getImageData(0, 0, 32, 24).data;
        let total = 0;
        for (let index = 0; index < pixels.length; index += 4) total += (pixels[index]! + pixels[index + 1]! + pixels[index + 2]!) / 3;
        lightingScore = total / (pixels.length / 4) / 255;
      }
    }
    this.#callbacks.onObservation({
      timestampMs: performance.now(), faceCount: result.faceLandmarks.length, eyeVisibility: points ? 1 : 0, poseScore: points ? poseScore(points) : 0, lightingScore,
      leftEar: points ? eyeAspectRatio(points, [362, 385, 387, 263, 373, 380]) : null,
      rightEar: points ? eyeAspectRatio(points, [33, 160, 158, 133, 153, 144]) : null,
      leftBlinkScore: points ? blendshapeScore(result, "eyeBlinkLeft") : null,
      rightBlinkScore: points ? blendshapeScore(result, "eyeBlinkRight") : null,
      interEyeDistancePx: points && this.#video && points[33] && points[263] ? distance(points[33], points[263]) * this.#video.videoWidth : null
    });
  }

  #drawLandmarkOverlay(points: readonly Landmark[]): void {
    if (!this.#video) return;
    if (!this.#landmarkOverlayCanvas) {
      this.#landmarkOverlayCanvas = document.createElement("canvas");
      this.#landmarkOverlayCanvas.className = "dev-landmark-overlay";
      this.#landmarkOverlayCanvas.setAttribute("aria-hidden", "true");
      document.body.append(this.#landmarkOverlayCanvas);
    }
    const bounds = this.#video.getBoundingClientRect();
    const canvas = this.#landmarkOverlayCanvas;
    canvas.width = Math.max(1, Math.round(bounds.width));
    canvas.height = Math.max(1, Math.round(bounds.height));
    canvas.style.left = `${bounds.left}px`; canvas.style.top = `${bounds.top}px`; canvas.style.width = `${bounds.width}px`; canvas.style.height = `${bounds.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(180, 255, 80, .72)";
    for (const point of points) { context.beginPath(); context.arc((1 - point.x) * canvas.width, point.y * canvas.height, 1.2, 0, Math.PI * 2); context.fill(); }
  }
}
