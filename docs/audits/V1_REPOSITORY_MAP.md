# EyeMate V1 Repository Map

```yaml
decision_status: confirmed
release_scope: m0
owner: tech-lead
audit_mode: read-only
audited_at: 2026-07-14
```

## Identity và trạng thái

| Thuộc tính | Giá trị đã xác minh |
|---|---|
| Project/Git root | `F:\dry-eye-app` |
| Remote | `https://github.com/QNSang/dry-eye-app.git` |
| Commit | `77ad32f1b519418d882d2d476f13206644536df9` |
| Branch | `main` |
| Worktree trước audit | Hai file untracked có sẵn: `CHAPTER_4_EVIDENCE_REPORT.md`, `PROJECT_DOCUMENTATION.md` |
| Desktop shell | Electron, entrypoint `main.js` từ `package.json` |
| Renderer | Vite + TypeScript, entrypoint `src/main.ts` qua `index.html` |
| Storage | Dexie/IndexedDB, database `DryEyeGuardDB`, schema version 3 |

Hai file untracked không được dùng làm runtime evidence. `dist/` và `node_modules/` đã tồn tại trước audit, bị `.gitignore` loại khỏi Git và không được tạo/cập nhật trong T-M0-001.

## Repository tree rút gọn

```text
F:\dry-eye-app
├── package.json / package-lock.json
├── main.js / preload.js
├── edge-lighting-main.js / display-filter-main.js
├── electron/                  # overlay preload + Windows native bridge
├── public/models/             # face_landmarker.task + survey_model.onnx
├── src/
│   ├── main.ts
│   ├── modules/camera/
│   ├── modules/checkup/
│   ├── modules/core/
│   ├── modules/pomodoro/
│   ├── modules/display/
│   └── services/DatabaseService.ts
├── tests/                     # 6 file, đều 0 byte
├── docs/                      # lịch sử, không phải runtime evidence
├── dist/                      # generated từ trước, ignored
└── node_modules/              # dependency từ trước, ignored
```

## Entrypoints và desktop shell

| Vai trò | File/symbol | Quan sát |
|---|---|---|
| NPM desktop entry | `package.json` → `main: main.js` | Electron main CommonJS |
| Main process | `main.js:createWindow` | `BrowserWindow`, preload, permission handler, dev URL/prod file |
| Preload | `preload.js:electronAPI` | Edge lighting, display filter, system notification qua `contextBridge` |
| Renderer | `src/main.ts:AppController` | Khởi tạo camera, checkup, database, Work Companion, display và UI |
| Overlay | `edge-lighting-main.js:initEdgeLighting` | Transparent always-on-top window và IPC |
| Display/native | `display-filter-main.js:initDisplayFilter`, `windows-magnifier.js` | Multi-display overlay và Magnification API qua Koffi |

Main/overlay windows cấu hình `nodeIntegration: false`, `contextIsolation: true`. `main.js` tự chấp thuận mọi permission Electron tên `media`, không kiểm tra product consent.

## Module ownership và dependency direction quan sát được

| Module | Runtime owner | Trách nhiệm |
|---|---|---|
| Composition/UI | `src/main.ts:AppController` | Tạo service, nối flow, bind DOM |
| Camera | `CameraController` → `CameraEngine` | Lifecycle, MediaPipe, blink/distance/quality, HUD event |
| Checkup | `DiagnosticFlow` | Survey → prediction → camera tùy chọn → fusion → persistence |
| Work session | `WorkCompanion` | Timer, pulse camera, score/nudge, summary |
| Persistence | `DatabaseService` / `DryEyeDatabase` | Dexie tables và CRUD/reset |
| Consent | `ConsentManager` | Boolean consent trong `localStorage` |
| Native/overlay | Electron main modules | Notification, edge lighting, display filter |

```text
src/main.ts
  → WorkCompanion + DiagnosticFlow + concrete UI/controllers
  → CameraController → CameraEngine
      → LandmarkProvider + BlinkDetector(new) + DistanceEstimator(new) + QualityMonitor
  → DatabaseService → Dexie/IndexedDB
renderer/preload → Electron IPC → main/overlay/native adapters
```

Boundary chưa theo ADR-001: application/UI classes trực tiếp dùng DOM, `localStorage`, concrete camera hoặc Dexie service.

## Camera data flow

```text
main.js auto-approves media permission
→ CameraEngine.startPreview → navigator.mediaDevices.getUserMedia
→ MediaStream/HTMLVideoElement → LandmarkProvider.detectForVideo
→ QualityMonitor + BlinkDetector + DistanceEstimator
→ camera:metrics event (bao gồm landmarks)
→ CameraController/HUD/WorkCompanion/DiagnosticFlow
→ aggregate checkup/session persistence
→ stopPreview: cancel RAF + clear interval + track.stop + srcObject=null
```

- `stopPreview` dừng media tracks và xóa `srcObject`.
- `LandmarkProvider.dispose` đóng model nhưng `stopPreview` không gọi; singleton model sống qua session.
- Quality được tính/emit nhưng không gate cứng blink/distance processing.
- `camera:metrics` chứa toàn bộ landmarks, vượt camera adapter output.
- Assessment result chứa `blinkHistory` và emit `camera:sessionComplete`; không thấy persistence trực tiếp nhưng runtime leakage chưa kiểm tra.

## Checkup data flow

```text
SurveyFlow → RiskPredictionService (ONNX hoặc heuristic fallback)
→ optional CameraController.measureSession
→ FusionEngine.calculateRisk
→ DatabaseService.saveCheckup → Dexie checkups → UI
```

Khi camera bỏ qua/lỗi, `DiagnosticFlow._finalizeDiagnosis` dùng camera metrics bằng `0`, vẫn fusion và lưu. Điều này xung đột typed missing của V2.

## Work-session data flow

```text
UI → WorkCompanion/PomodoroTimer → periodic camera pulse
→ distance/blink snapshot + score/policy/nudge
→ summary_ready → src/main.ts save approximate WorkSession
→ Dexie workSessions + dailyStats
```

Timer-triggered camera check có consent guard, nhưng immediate check trong `startSession` gọi `_performPulseCheck` trực tiếp. Session persistence dùng thời gian xấp xỉ và `updateDailyStats(0,0,0)`.

## Persistence flow

- Dexie `DryEyeGuardDB`, schema `version(3)`: `checkups`, `dailyStats`, `achievements`, `userProgress`, `workSessions`.
- Không có migration record, pre-migration backup, integrity check hoặc recovery mode.
- Distance calibration ở `localStorage` key `distance_calibration_v3`; timestamp/sample count trả về là approximation.
- Consent ở `dry_eye_app_consent`, không purpose/scope/text version/time/status.
- `DatabaseService.resetData` không clear `workSessions`, nên “Clear Data” bỏ sót session records.

## Model và asset flow

- Tracked local assets: `public/models/face_landmarker.task`, `survey_model.onnx`.
- ONNX model dùng local path, nhưng ONNX WASM đặt tại jsDelivr.
- MediaPipe mặc định dùng WASM jsDelivr và model Google Storage khi không truyền `assetsPath`.
- `CameraEngine.DEFAULT_CONFIG.mediapipeAssetsPath` là `undefined`, nên mặc định đi CDN.
- Không có checksum/manifest/version/license record cho packaged assets.

## Package/release flow

| Flow | Bằng chứng tĩnh |
|---|---|
| Dev web | `npm run dev` → Vite 5174 |
| Dev Electron | Vite + wait-on + Electron |
| Renderer build | `tsc && vite build` |
| Desktop package | renderer build + `electron-builder` |

`electron-builder` không khai báo trong package/lockfile, `electron.config.js` rỗng, không MSIX/Store/signing/update config và không `.github` CI directory. Không command nào được chạy.

## Test/CI map

- Sáu file `tests/unit`/`tests/integration` đều 0 byte.
- Không script test/lint/typecheck độc lập; không test runner root được khai báo.
- Không CI workflow quan sát được.
- Không test denied/busy/disconnect, leakage, migration/recovery hoặc packaging.

## Duplicate/legacy candidates

- Hai `BlinkDetector` và hai `DistanceEstimator`; `CameraEngine` import bản trong `blink/` và `distance/`.
- Hai bản top-level là legacy candidates, chưa kết luận dead vì không chạy dependency graph/bundler trace.
- Nhiều file tracked 0 byte gồm state/storage/dashboard/survey/worker/styles/tests; runtime status là UNKNOWN.

## Command inventory, không chạy

Các script đọc được: `dev`, `build`, `preview`, `electron:dev`, `electron:build`. Tính chạy được là UNKNOWN trong T-M0-001.
