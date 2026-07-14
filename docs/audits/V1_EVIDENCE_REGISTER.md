# EyeMate V1 Evidence Register

```yaml
decision_status: confirmed
release_scope: m0
owner: tech-lead
source_root: F:\dry-eye-app
source_commit: 77ad32f1b519418d882d2d476f13206644536df9
audit_mode: read-only
```

## Quy ước

- `FACT`: quan sát trực tiếp từ file/config/Git.
- `ASSUMPTION`: suy luận chưa đủ bằng chứng; cấm dùng để chọn kiến trúc.
- `OPEN DECISION`: cần owner/evidence POC.
- `UNKNOWN`: bằng chứng thiếu hoặc command bị cấm chạy.

## Register

| ID | Loại | File/symbol/config thật | Mô tả và tác động M0 | Liên quan | Tin cậy | Điều chưa xác minh |
|---|---|---|---|---|---|---|
| `V1-E-001` | FACT | Git root/HEAD | Repo `F:\dry-eye-app`, `main`, commit `77ad32f…`; hai docs untracked có sẵn. | T-M0-001, ADR-003 | Cao | Không fetch remote. |
| `V1-E-002` | FACT | `package.json` | Electron/Vite/TS, main `main.js`, có dev/build/electron scripts. | `FR-M0-001` | Cao | Command chưa chạy. |
| `V1-E-003` | FACT | `main.js:createWindow` | Context isolation/preload; dev localhost, prod `dist/index.html`. | `REL-M0-001` | Cao | Packaged runtime chưa chạy. |
| `V1-E-004` | FACT | `main.js:setPermissionRequestHandler` | Tự approve permission `media`; xung đột consent/denied path. | `FR-M0-002`, `AC-M0-003` | Cao | OS behavior chưa test. |
| `V1-E-005` | FACT | `preload.js:electronAPI` | IPC bridge cho overlay/display/notification và alias legacy. | ADR-003 | Cao | Sender validation chưa test. |
| `V1-E-006` | FACT | `CameraEngine.startPreview/stopPreview` | getUserMedia; stop RAF/interval/tracks/srcObject. | `FR-M0-002`, `AC-M0-002`–`004`, `017` | Cao | Disconnect/restart chưa test. |
| `V1-E-007` | FACT | `LandmarkProvider._doInitialize` | MediaPipe WASM mặc định jsDelivr, model mặc định Google Storage. | `FR-M0-004`, `SEC-M0-001` | Cao | Runtime trace chưa chạy. |
| `V1-E-008` | FACT | `RiskPredictionService.loadModel` | ONNX model local nhưng WASM ở jsDelivr. | `FR-M0-004`, `SEC-M0-001` | Cao | Local WASM packaging UNKNOWN. |
| `V1-E-009` | FACT | `public/models/*` | Hai local model assets tracked; chưa có checksum/license manifest. | ADR-004 | Cao | Runtime local use chưa chứng minh. |
| `V1-E-010` | FACT | `CameraEngine.processFrameData` | `camera:metrics` chứa toàn bộ face landmarks; xung đột output contract. | `PRIV-M0-001`, `AC-M0-018/019` | Cao | Persistence/leakage runtime UNKNOWN. |
| `V1-E-011` | FACT | `processFrameData`, `runAssessmentSession` | Quality emit nhưng không gate cứng; session tạo `OK` chủ yếu theo FPS. | `FR-M0-003`, `AC-M0-005` | Cao | Accuracy UNKNOWN. |
| `V1-E-012` | FACT | `CameraController`, `getSnapshotMetrics`, `DiagnosticFlow` | Missing/failed camera bị map thành `0` ở nhiều boundary. | INV-001, `DATA-M0-001` | Cao | Chưa truy hết UI path. |
| `V1-E-013` | FACT | `distance/DistanceEstimator.estimate` | Chưa calibration dùng K=8500 vẫn xuất cm; UNKNOWN có `estCm:0`. | `VAL-M0-002` | Cao | Accuracy/device variance UNKNOWN. |
| `V1-E-014` | FACT | Distance/WorkCompanion | Threshold 30/60, 45/70 và `<45` không thống nhất/versioned. | `VAL-M0-002`, ADR-003 | Cao | Flow runtime ưu tiên chưa đo. |
| `V1-E-015` | FACT | `AssessmentResult`, `runAssessmentSession` | Result chứa `blinkHistory`, emit qua sessionComplete. | `PRIV-M0-001` | Cao | Consumer/leakage runtime UNKNOWN. |
| `V1-E-016` | FACT | `DatabaseService:DryEyeDatabase` | Dexie schema v3, không migration record/backup/recovery. | `DATA-M0-002` | Cao | Existing user DB UNKNOWN. |
| `V1-E-017` | FACT | `DatabaseService.resetData` | Reset không clear `workSessions`. | Privacy gap | Cao | Orphan runtime chưa tạo. |
| `V1-E-018` | FACT | `ConsentManager` | Boolean localStorage consent, không version/purpose/time; log object consent. | `PRIV-M0-001` | Cao | Onboarding UI chưa audit toàn bộ. |
| `V1-E-019` | FACT | `RiskPredictionService`, `DiagnosticFlow` | ONNX lỗi fallback heuristic; tạo risk/diagnosis content. | M0 out-of-scope | Cao | Model/clinical validation UNKNOWN. |
| `V1-E-020` | FACT | `DiagnosticFlow._finalizeDiagnosis` | Lưu survey/camera aggregate; missing camera thành zeros. | `DATA-M0-001`, INV-001 | Cao | Không thấy landmark persistence path này. |
| `V1-E-021` | FACT | `WorkCompanion`, `src/main.ts:summary_ready` | Pulse camera + score/nudge; lưu thời gian xấp xỉ/daily zeros. | ADR-003 | Cao | Runtime correctness UNKNOWN. |
| `V1-E-022` | FACT | package/lock + empty `electron.config.js` | Script gọi electron-builder nhưng dependency/config thiếu. | `REL-M0-001/004` | Cao | Không chạy package. |
| `V1-E-023` | FACT | `tests/**`, package, `.github` absent | 6 test file 0 byte; không test script/runner/CI. | `VAL-M0-001` | Cao | CI ngoài repo UNKNOWN. |
| `V1-E-024` | FACT | Duplicate detector files/imports | CameraEngine dùng bản nested; top-level là legacy candidates. | ADR-003 maintenance | Trung bình | Không kết luận dead. |
| `V1-E-025` | FACT | overlay/display/native files | Có always-on-top, multi-monitor và Koffi Magnification bridge. | ADR-003 native/overlay | Cao | Store/MSIX compatibility UNKNOWN. |
| `V1-E-026` | FACT | `.gitignore` + filesystem | `dist`/`node_modules` có sẵn, ignored; không phải CI evidence. | `REL-M0-001` | Cao | Nguồn/thời điểm sinh UNKNOWN. |
| `V1-E-027` | FACT | Empty tracked files | Nhiều module/test/worker/style 0 byte. | ADR-003 maintenance | Cao | Intended future use UNKNOWN. |
| `V1-A-001` | ASSUMPTION | TS camera files | Một phần type/algorithm có thể reuse sau khi sửa boundary/semantics. | ADR-003 | Thấp | Cần contract tests/review. |
| `V1-A-002` | ASSUMPTION | Electron V1 | Electron có thể ít rewrite shell hơn Tauri. Cấm dùng để chọn shell. | `AC-M0-013` | Thấp | Chưa effort estimate. |
| `V1-A-003` | ASSUMPTION | Local model files | Có thể package offline sau khi bổ sung WASM/manifest. | `FR-M0-004` | Thấp | License/resolver/checksum UNKNOWN. |
| `V1-O-001` | OPEN DECISION | Repository owner | Migrate/reuse V1 hay chỉ dùng làm lịch sử? | ADR-003 | Cao | Chưa chốt. |
| `V1-O-002` | OPEN DECISION | Product + Tech | Overlay/display filter còn là requirement V2/M0 không? | ADR-003 | Cao | Scope chưa xác nhận. |
| `V1-O-003` | OPEN DECISION | Measurement + Tech | Runtime/model/worker/local resolver nào vào POC? | ADR-004 | Cao | Chưa license/performance evidence. |
| `V1-O-004` | OPEN DECISION | Data + Tech | IndexedDB import/archive/start fresh? | `DATA-M0-002` | Cao | User data policy UNKNOWN. |
| `V1-O-005` | OPEN DECISION | Privacy + Product | Có giữ/migrate checkup/work-session legacy không? | `D-013` | Cao | Consent/provenance thiếu. |
| `V1-O-006` | OPEN DECISION | Release + Security | Test identity/certificate/Store channel POC. | `REL-M0-004` | Cao | Runner/identity chưa có. |
| `V1-U-001` | UNKNOWN | Camera runtime | Denied/busy/disconnect/restart trên Windows 11. | `AC-M0-003/004/017` | — | Không chạy hardware test. |
| `V1-U-002` | UNKNOWN | Network runtime | Request thực tế ngoài hai CDN path tĩnh. | `SEC-M0-001` | — | Không chạy trace. |
| `V1-U-003` | UNKNOWN | Privacy runtime | Landmark/blink history có vào log/crash/temp không. | `PRIV-M0-001` | — | Không instrumentation. |
| `V1-U-004` | UNKNOWN | Build/package | Command chạy trên clean machine hay không. | `REL-M0-001/003` | — | Không chạy/cài. |
| `V1-U-005` | UNKNOWN | MSIX/Store/update | Không có config/evidence. | `REL-M0-004` | — | Không artifact. |
| `V1-U-006` | UNKNOWN | Measurement | Accuracy/unknown rate/false alert/device variance. | `VAL-M0-002` | — | Không benchmark. |
| `V1-U-007` | UNKNOWN | ONNX/heuristic | Feature order/output/validation/clinical validity. | M0 out-of-scope | — | Không validation. |
| `V1-U-008` | UNKNOWN | Legacy modules | Duplicate/0-byte files dead hay future. | ADR-003 | — | Không bundle/history trace. |
| `V1-U-009` | UNKNOWN | Existing data | Schema/data volume/corruption/user population. | `DATA-M0-002` | — | Không mở user DB. |
| `V1-U-010` | UNKNOWN | Dependency/security | License/SBOM/vulnerability/network tree. | ADR-003/004 | — | Không scanner/install. |

## Counts

- FACT: 27
- ASSUMPTION: 3
- OPEN DECISION: 6
- UNKNOWN: 10
