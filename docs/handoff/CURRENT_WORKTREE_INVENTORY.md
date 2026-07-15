# Current Worktree Inventory

Ngày audit: 2026-07-15
Base: `26c30d3`
Target: `main` theo owner approval trực tiếp

Backup nền đã push: `backup/pre-main-handoff-20260715-1838` tại `26c30d3`.

## Audit an toàn

- `.gitignore` loại `.m1/`, `.m4/`, `.pilot/`, `dist/`, `node_modules/` và build output Tauri.
- Không có changed/untracked file từ 5 MB trở lên; không có MSIX, database, certificate, environment file, camera log/video/raw frame hoặc calibration cá nhân trong candidate paths.
- Secret scan không phát hiện GitHub token, cloud key, private key, client secret, API key hoặc password assignment.
- Generated unsigned MSIX vẫn ở `.m1/msix/` và không được commit.

## Phân loại thay đổi

### 1. Wellness Questionnaire

- Files: `src/symptom-checkup/wellness-check.ts`, `src/tests/unit/wellness-check.test.ts`, `src/shared/m1-contract.ts`, các phần integration trong `src/main/main.ts`, `src/platform-electron/sqlite-storage.ts`, `src/renderer/app.ts`, pilot matrix/validator và `docs/product/questionnaire-decision-d004.md`.
- Mục đích: questionnaire riêng EyeMate, 5 câu, 0–3, tổng 0–15, action group phi lâm sàng, disclaimer đầu/cuối.
- Trạng thái/test: implemented; typecheck/unit/integration/UI/pilot contract PASS.
- Known issue/dependency: không phải validated clinical tool; phụ thuộc Safety Gate và encrypted storage hiện hữu.
- Commit đề xuất: `feat(wellness): preserve approved questionnaire flow`.

### 2. D-009 và calibration

- Files: `src/distance/ratio-zone-filter.ts`, `src/distance/distance-zone.ts`, `src/camera/calibration-service.ts`, `src/camera/measurement-window.ts`, unit tests và `docs/product/distance-decision-d009.md`; integration seam nằm trong main/preload/storage/renderer.
- Mục đích: ratio-zone fail-closed, median/outlier/hysteresis/dwell và calibration aggregate device-bound.
- Trạng thái/test: core và persistence PASS; real webcam `ENVIRONMENT_BLOCKED`.
- Known issue/dependency: không claim centimet/accuracy; cần camera quality đạt và D-009 approval.
- Commit đề xuất: `feat(camera): add fail-closed calibration pipeline`.

### 3. Camera/runtime

- Files: `src/renderer/camera-runtime.ts`, phần camera trong `src/main/main.ts`, `src/preload/preload.ts`, shared contracts.
- Mục đích: landmark overlay RAM-only, quality gaps và lifecycle integration.
- Trạng thái/test: runtime integration/smoke PASS với accuracy `UNKNOWN`; full measurement fail quality gate.
- Known issue/dependency: MediaPipe local dependency; không persistence raw frames/landmarks.
- Commit đề xuất: gộp vào camera commit hoặc WIP integration commit nếu hunk không tách an toàn.

### 4. DevPanel và demo support

- Files: `src/camera/dev-overrides.ts`, `src/renderer/dev-panel.ts`, runtime gate/contracts, renderer integration, `tools/ui/run-dev-panel-validation.mjs`.
- Mục đích: `Ctrl+Shift+D`, session-only overrides, RAM-only overlay/raw metrics; production default false.
- Trạng thái/test: `acceptance:dev-panel` PASS.
- Known issue/dependency: chỉ unpackaged + `--enable-dev-panel`; debug export cố ý disabled.
- Commit đề xuất: `feat(demo): add unpackaged DevPanel support`.

### 5. Clarity/production UI

- Files: `src/renderer/app.ts`, `styles.css`, `index.html`, main UI harness, `tools/ui/run-clarity-production-validation.mjs`, Clarity docs và production screenshots.
- Mục đích: production top navigation, seven-route shell, semantic evidence visuals, accessible/reduced-motion interactions.
- Trạng thái/test: production acceptance PASS; functional hooks preserved.
- Known issue/dependency: shared renderer file chứa Wellness/camera/design-lab seams nên cần WIP integration commit có giải thích.
- Commit đề xuất: `feat(ui): add Clarity production interface` hoặc `feat(handoff): integrate demo application surfaces`.

### 6. Living Aurora Design Lab

- Files: route/CSS nằm trong shared renderer, `tools/ui/run-living-aurora-validation.mjs`, `docs/validation/living-aurora-phase-a.md`, sáu PNG `living-aurora-*`.
- Mục đích: reference full viewport dev-only; Lumi là `ART_PLACEHOLDER`.
- Trạng thái/test: acceptance PASS; không rollout production.
- Known issue/dependency: visual reference cũ, không production capability.
- Commit đề xuất: `feat(design-lab): preserve Living Aurora reference`.

### 7. Taste Direction Design Lab

- Files: `src/renderer/taste-design-lab.ts`, `taste-design-lab.css`, acceptance tool, Gate T0/A + Clarity reference docs và screenshots `taste-afterimage-*`/`clarity-grid-*`.
- Mục đích: lưu audit trail Afterimage và reference Clarity Grid hiện hành.
- Trạng thái/test: acceptance PASS; Afterimage dark direction đã superseded.
- Known issue/dependency: không dùng làm production route; không IPC/camera/database/network.
- Commit đề xuất: `feat(design-lab): add taste and Clarity references`.

### 8. MSIX source/tooling

- Files: `tools/m1/build-msix.mjs`, `tools/m1/install-unsigned-demo-msix.ps1`, scripts `build:demo`/`build:msix` trong `package.json`.
- Mục đích: MakeAppx unsigned artifact và Windows 11 `-AllowUnsigned` helper.
- Trạng thái/test: artifact build + staged smoke PASS; Authenticode `NotSigned`.
- Known issue/dependency: clean-machine install chưa chạy; không NSIS/electron-builder; MSIX binary ignored.
- Commit đề xuất: `build(msix): add unsigned demo packaging tooling`.

### 9. Tests

- Files: unit/integration tests mới, UI validation tools, updates cho M2/M3 isolated userData và pilot fixtures.
- Mục đích: regression coverage cho questionnaire, ratio filtering, calibration, DevPanel và UI preservation.
- Trạng thái: automated suites PASS, real-camera full measurement blocked.
- Known issue/dependency: Electron SQLite experimental warning không làm suite fail.
- Commit đề xuất: đi cùng feature tương ứng; shared harness vào `test: extend handoff acceptance coverage`.

### 10. Documentation/screenshots

- Files: `PROJECT_STATUS.md`, operational/validation docs, `docs/handoff/*`, production/reference evidence PNG/WEBP.
- Mục đích: decision trail, visual evidence, operator/developer handoff.
- Trạng thái: current; 14 screenshot deletions đã audit bên dưới.
- Known issue/dependency: screenshots là evidence, không golden pixel tests.
- Commit đề xuất: `docs(handoff): document current project state`.

### 11. Unclassified

- Không có candidate file chưa phân loại sau audit. Shared files được đánh dấu integration seam thay vì giả vờ thuộc một feature duy nhất.

## Audit 14 screenshot bị xóa

Tất cả đường dẫn cũ đều có `exact reference count = 0` trong Markdown/code/test. Chúng mô tả production shell trước Clarity và bị thay bằng evidence có naming rõ scope. Deletion được xác định có chủ đích.

| File cũ | Thay thế/evidence hiện hành | Kết luận |
|---|---|---|
| `checkup-result-1024x768.png` | `clarity-grid-checkup-result-1100x760.png`; production checkup hooks trong rollout doc | Xóa |
| `checkup-result-1280x800.png` | như trên; acceptance UI chụp naming Clarity | Xóa |
| `home-1024x768.png` | `clarity-production-home-1100x760.png` | Xóa |
| `home-1280x800.png` | `clarity-production-home-1280x800.png` | Xóa |
| `intelligence-1024x768.png` | Functional Preservation Matrix + `acceptance:clarity-production` route Intelligence | Xóa |
| `intelligence-1280x800.png` | như trên; không còn direct reference | Xóa |
| `privacy-1024x768.png` | `clarity-production-privacy-1100x760.png` | Xóa |
| `privacy-1280x800.png` | như trên | Xóa |
| `reports-1024x768.png` | `clarity-production-reports-1100x760.png` | Xóa |
| `reports-1280x800.png` | như trên và `clarity-grid-report-1100x760.png` | Xóa |
| `session-active-1024x768.png` | `clarity-grid-companion-active-1100x760.png`; production timer acceptance | Xóa |
| `session-active-1280x800.png` | như trên; `clarity-production-companion-ready-1100x760.png` cho ready state | Xóa |
| `settings-1024x768.png` | `clarity-production-settings-1100x760.png` | Xóa |
| `settings-1280x800.png` | như trên | Xóa |

Không có broken reference phát sinh từ 14 deletion. Các ảnh mới không chứa dữ liệu người dùng thật; chúng là validation/reference evidence tạo trong isolated test profile.

## Commit strategy

Các module độc lập được commit theo feature. `src/main/main.ts`, `src/renderer/app.ts`, `styles.css`, storage/preload/contracts và `package.json` chứa hunk chéo nhiều feature; nếu hunk staging làm mất khả năng build, chúng được đưa vào commit rõ tên `feat(handoff): integrate demo application surfaces`, không âm thầm gán sai ownership.
