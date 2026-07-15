import { EMPTY_DEV_OVERRIDES, validateDevOverrides, type DevOverrides } from "../camera/dev-overrides.js";

export interface DevPanelReadings {
  readonly cameraState: string;
  readonly deviceLabel: string;
  readonly poseScore: number | null;
  readonly interEyeDistancePx: number | null;
  readonly ear: number | null;
  readonly calibrationState: string;
}

export interface DevPanelBindings {
  readonly getReadings: () => DevPanelReadings;
  readonly onOverridesChanged: (overrides: DevOverrides) => void;
  readonly onLandmarkOverlayChanged: (enabled: boolean) => void;
}

const STORAGE_KEY = "eyemate:dev-panel:v1";

export class DevPanelController {
  readonly #bindings: DevPanelBindings;
  #overrides: DevOverrides = EMPTY_DEV_OVERRIDES;
  #root: HTMLElement | null = null;
  #ticker: number | null = null;
  #enabled = false;

  constructor(bindings: DevPanelBindings) { this.#bindings = bindings; }

  enable(): void {
    if (this.#enabled) return;
    this.#enabled = true;
    document.addEventListener("keydown", this.#onShortcut);
  }

  disable(): void {
    document.removeEventListener("keydown", this.#onShortcut);
    this.close();
    this.#enabled = false;
  }

  get open(): boolean { return this.#root !== null; }
  get overrides(): DevOverrides { return this.#overrides; }

  readonly #onShortcut = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d")) return;
    event.preventDefault();
    this.open ? this.close() : this.show();
  };

  show(): void {
    if (!this.#enabled || this.#root !== null) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true }));
    const root = document.createElement("aside");
    root.className = "dev-panel";
    root.setAttribute("aria-label", "EyeMate developer panel");
    root.innerHTML = `<div class="dev-panel-heading"><strong>DEV PANEL</strong><span>unpackaged only</span><button id="dev-panel-close" type="button" aria-label="Đóng developer panel">×</button></div>
      <section><h3>Camera</h3><dl class="dev-readings"><div><dt>Trạng thái</dt><dd data-dev-reading="state">—</dd></div><div><dt>Thiết bị</dt><dd data-dev-reading="device">—</dd></div><div><dt>Pose score</dt><dd data-dev-reading="pose">—</dd></div><div><dt>IOD px</dt><dd data-dev-reading="iod">—</dd></div><div><dt>EAR</dt><dd data-dev-reading="ear">—</dd></div></dl></section>
      <section><h3>Overrides</h3><label><input id="dev-force-distance-enabled" type="checkbox"> Force distance</label><input id="dev-force-distance" type="number" min="20" max="150" value="45" aria-label="Force distance cm" disabled><span>cm · dev simulation</span><label><input id="dev-force-ear-enabled" type="checkbox"> Force EAR</label><input id="dev-force-ear" type="number" min="0.05" max="0.6" step="0.01" value="0.15" aria-label="Force EAR" disabled><label><input id="dev-force-blink-enabled" type="checkbox"> Force blink rate</label><input id="dev-force-blink" type="number" min="1" max="60" value="15" aria-label="Force blink rate" disabled><span>/phút</span><label><input id="dev-landmark-overlay" type="checkbox"> Landmark overlay (RAM only)</label><label><input id="dev-show-raw" type="checkbox"> Show raw metrics</label><label>Log level <select id="dev-log-level"><option value="NONE">none</option><option value="VERBOSE">verbose UI only</option></select></label></section>
      <section><h3>Calibration</h3><p data-dev-reading="calibration">—</p><p class="dev-panel-note">K constant không áp dụng: V2 dùng ratio/zone fail-closed.</p></section>
      <div class="actions"><button class="btn" id="dev-reset" type="button">Reset all overrides</button><button class="btn" type="button" disabled title="Bị tắt bởi privacy boundary">Export debug log</button></div>`;
    document.body.append(root);
    const badge = document.createElement("span"); badge.className = "dev-mode-badge"; badge.textContent = "DEV MODE"; badge.id = "dev-mode-badge"; document.body.append(badge);
    this.#root = root;
    root.querySelector("#dev-panel-close")?.addEventListener("click", () => this.close());
    root.querySelector("#dev-reset")?.addEventListener("click", () => this.reset());
    for (const id of ["distance", "ear", "blink"] as const) {
      const enabled = root.querySelector<HTMLInputElement>(`#dev-force-${id}-enabled`);
      const input = root.querySelector<HTMLInputElement>(`#dev-force-${id}`);
      enabled?.addEventListener("change", () => { if (input) input.disabled = !enabled.checked; this.#readOverrides(); });
      input?.addEventListener("input", () => this.#readOverrides());
    }
    for (const id of ["dev-landmark-overlay", "dev-show-raw", "dev-log-level"]) root.querySelector(`#${id}`)?.addEventListener("change", () => this.#readOverrides());
    this.#ticker = window.setInterval(() => this.#renderReadings(), 250);
    this.#renderReadings();
    root.querySelector<HTMLElement>("#dev-panel-close")?.focus();
  }

  close(): void {
    if (this.#ticker !== null) window.clearInterval(this.#ticker);
    this.#ticker = null;
    this.#root?.remove();
    this.#root = null;
    document.querySelector("#dev-mode-badge")?.remove();
    sessionStorage.removeItem(STORAGE_KEY);
    this.#overrides = EMPTY_DEV_OVERRIDES;
    this.#bindings.onOverridesChanged(this.#overrides);
    this.#bindings.onLandmarkOverlayChanged(false);
  }

  reset(): void {
    this.close();
    this.show();
  }

  #readOverrides(): void {
    if (!this.#root) return;
    const numberWhenChecked = (id: string): number | null => this.#root?.querySelector<HTMLInputElement>(`#dev-force-${id}-enabled`)?.checked ? Number(this.#root.querySelector<HTMLInputElement>(`#dev-force-${id}`)?.value) : null;
    try {
      this.#overrides = validateDevOverrides({ forceDistanceCm: numberWhenChecked("distance"), forceEar: numberWhenChecked("ear"), forceBlinkRate: numberWhenChecked("blink"), showLandmarkOverlay: this.#root.querySelector<HTMLInputElement>("#dev-landmark-overlay")?.checked ?? false, showRawMetrics: this.#root.querySelector<HTMLInputElement>("#dev-show-raw")?.checked ?? false, logLevel: (this.#root.querySelector<HTMLSelectElement>("#dev-log-level")?.value ?? "NONE") as DevOverrides["logLevel"] });
      this.#bindings.onOverridesChanged(this.#overrides);
      this.#bindings.onLandmarkOverlayChanged(this.#overrides.showLandmarkOverlay);
    } catch { /* Invalid intermediate input is ignored until it becomes valid. */ }
  }

  #renderReadings(): void {
    if (!this.#root) return;
    const readings = this.#bindings.getReadings();
    const set = (key: string, value: string): void => { const element = this.#root?.querySelector<HTMLElement>(`[data-dev-reading='${key}']`); if (element) element.textContent = value; };
    set("state", readings.cameraState); set("device", readings.deviceLabel); set("pose", readings.poseScore?.toFixed(3) ?? "—"); set("iod", readings.interEyeDistancePx?.toFixed(1) ?? "—"); set("ear", readings.ear?.toFixed(3) ?? "—"); set("calibration", readings.calibrationState);
  }
}
