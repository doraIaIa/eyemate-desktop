# Taste-driven production redesign: Gate T0

Ngày audit: 2026-07-15
Task base commit: `26c30d3`
Trạng thái: `WAITING_FOR_TASTE_PLAN_APPROVAL`
Phạm vi: audit và Taste Plan; chưa dựng Design Lab mới, chưa rollout production.

## Skill provenance

- `redesign-existing-projects`: `C:\Users\ADMIN\.codex\skills\redesign-existing-projects\SKILL.md`.
- `design-taste-frontend`: `C:\Users\ADMIN\.codex\skills\design-taste-frontend\SKILL.md`.
- Source: `https://github.com/Leonxlnx/taste-skill`.
- Ref đã ghim: `b17742737e796305d829b3ad39eda3add0d79060`.
- Hai thư mục cài chỉ có `SKILL.md`, không có reference phụ bắt buộc.
- `design-taste-frontend` không chuyên cho dashboard hoặc wizard. EyeMate chỉ dùng skill này cho visual language, layout, type, color, motion, anti-default discipline và critique. Spec, acceptance, safety, privacy, data semantics và workflow `Scan -> Diagnose -> Fix` có quyền cao hơn.

## Design Read và dials

Reading this as: redesign-overhaul về hình ảnh cho desktop wellness companion local-first, dành cho người trưởng thành dùng màn hình lâu, với ngôn ngữ yên tĩnh, giàu tính đồng hành và gợi thế giới focus/vision, triển khai bằng Vanilla DOM, TypeScript và CSS hiện hữu.

```text
DESIGN_VARIANCE: 7
MOTION_INTENSITY: 5
VISUAL_DENSITY: 5
REDESIGN_MODE: OVERHAUL_VISUAL_PRESERVE_BEHAVIOR
```

Không điều chỉnh dial. Mức 7/5/5 đủ thoát dashboard nhưng vẫn giữ clarity, reduced motion và độ tin cậy của một sản phẩm wellness nhạy cảm.

## Scan: hiện trạng kỹ thuật và visual

- Stack thực tế: Electron `39.8.5`, TypeScript `5.9.3`, Vanilla DOM và CSS. Pipeline không dùng Vite dù prompt ban đầu dự đoán có Vite.
- Router: hash route trong `src/renderer/app.ts`; production có `home`, `checkup`, `companion`, `intelligence`, `reports`, `privacy`, `settings`.
- Renderer chỉ gọi application use case qua typed preload. Camera runtime là adapter renderer riêng; SQLite và file export nằm sau IPC.
- Production shell: Electron titlebar, sidebar cố định khoảng 218 px, content wrapper và card grid.
- Token hiện tại: `#090F1A`, các surface navy, accent `#00C9A7`, hỗ trợ amber/coral/blue; Inter/system sans và mono fallback; radius 6/10/16/24 px; shadow tối và teal glow.
- Pattern chính: orb trung tâm, metric card lặp `label -> big number -> note -> progress`, card grid 2/4 cột, eyebrow uppercase, status pill, teal progress bar.
- Motion: orb breathing/ripple, skeleton shimmer, toast entry, hover lift; reduced motion đã có cả media query và preference persistence.
- Asset: không có remote font/image/CDN trong renderer; CSP local-first. Icon production hiện là ký tự Unicode và một số SVG inline không thành hệ nhất quán.
- Accessibility có focus-visible, semantic button/link, aria-live, modal Escape và focus restore. Modal chưa có focus trap hoàn chỉnh; static accessibility checker còn nông và chủ yếu đọc `index.html`, không audit DOM sinh động trong `app.ts`.
- UI acceptance click xuyên suốt route, back/forward/reload, session, nudge, report, export preview, reset/delete và settings. Failure Wellness hiện có là pre-existing và ngoài scope Taste Gate.

## Diagnose

### Nên bảo toàn

- Hash/deep-link/back/reload và bảy route production.
- Typed preload boundary, local-only semantics và native Save dialog.
- Survey-only fallback, camera consent/lifecycle, timer-only session, nudge policy, baseline/VLI abstention, report preview/export, reset/delete và preference persistence.
- Missing/unknown/quality/version semantics; disabled control có lý do.
- Reduced motion, keyboard focus, modal return focus và error/retry state.
- Production copy được spec/owner kiểm soát; không sửa clinical/questionnaire trong redesign.

### Nên loại bỏ khỏi mental model mới

- Sidebar cố định làm khung nhận diện chính.
- Dark navy + acid teal/cyan và teal glow làm dấu hiệu thương hiệu duy nhất.
- Orb generic ở Home và card grid đồng hạng trên gần mọi route.
- Metric card lặp số lớn, progress track và delta dù dữ liệu thiếu.
- Eyebrow uppercase trên mọi section; pha tiếng Anh kỹ thuật dày trong UI.
- Icon Unicode thiếu silhouette/stroke system nhất quán.
- Animation ambient lặp trong Home dù không mang state mới.

### Risk log, chưa tự sửa tại T0

- `aria-label="Trạng thái sức khỏe mắt hiện tại"` ở Home có nguy cơ vượt claim boundary; cần Product review trước khi đổi copy.
- Renderer hiện hiển thị `EAR` trực tiếp trong luồng camera, trái với yêu cầu copy của prompt; cần measurement/product owner quyết định, không sửa trong Taste task.
- Wellness Check uncommitted đang bị owner tạm dừng. Mọi questionnaire wording, scoring và result semantics là `OBSOLETE_PENDING_APPROVAL` cho tới quyết định DEQ-5 hoặc questionnaire riêng.
- Dynamic egress vẫn `UNKNOWN`; Privacy không được nâng cấp thành claim không mạng tuyệt đối.
- Light theme, camera mode và calibration setting còn disabled/policy-gated; redesign không được làm chúng trông khả dụng.

## UI Capability Preservation Matrix

| Route | Capability | Control hiện tại | Handler/use case | Data/state | Test/evidence | Vị trí mới dự kiến | Status |
|---|---|---|---|---|---|---|---|
| Global | Bảy route, deep-link, Back/Forward/reload | Sidebar links | Hash router `renderRoute` | route + async state | `UI_HISTORY_*`, `UI_RELOAD_*` | Top navigation một dòng + utility entries | `WIRED` |
| Global | Loading/error/retry | Skeleton, toast, error view | `withOperationTimeout`, `runMutation` | loading, timeout, recoverable error | async unit + UI smoke | Inline status rail và contextual notice | `WIRED` |
| Global | Dialog/destructive confirm | Modal + Escape | `showModal`, focus restore | preview, confirm, cancel | export/delete/session UI assertions | Focused sheet, giữ action hierarchy | `PARTIAL` vì thiếu focus trap đầy đủ |
| Hôm nay | Runtime/session/privacy context | Orb, metrics, context cards | 6 preload reads | camera off, no data, session active | Home screenshots + UI smoke | Greeting narrative + action path + evidence margin | `WIRED` |
| Hôm nay | Quick actions | Bắt đầu phiên, Khám mắt, Báo cáo | Hash links | route intent | route smoke | Ba action rõ, không ẩn trong menu | `WIRED` |
| Khám mắt | Intended use và camera consent | Bước 1 | onboarding IPC | consent unknown/granted/skipped | M1/camera/UI suites | Opening letter + explicit choice | `WIRED` |
| Khám mắt | Questionnaire và self-report result | Bước 2/5, result/export | Wellness diff uncommitted | answers, safety, missing, report | unit/integration pass; UI fail đã biết | Giữ slot trong journey, chưa thiết kế copy cụ thể | `OBSOLETE_PENDING_APPROVAL` |
| Khám mắt | Camera choice, quality, calibration, measurement, fallback | Bước 3/4 | `LocalCameraRuntime`, aggregate window | denied/busy/unavailable/low quality/unknown | camera harness + runtime smoke | Guided focus corridor + survey-only escape | `PARTIAL` vì accuracy/ground truth chưa được duyệt |
| Đồng hành | Start/pause/resume/end/cancel/recovery | Session panel | work-session IPC | active, paused, recovery, completed | `UI_SESSION_*`, M2 acceptance | Quiet focus stage, controls luôn thấy | `WIRED` |
| Đồng hành | Nudge và response | Toast/aside | request/respond nudge | emit, cooldown, quiet, snooze/dismiss | `UI_NUDGE_*`, policy unit | Contextual edge note, không gây giật mình | `WIRED` |
| Thấu hiểu | Baseline/pattern/VLI/missing | Bốn card | M3 report IPC | learning/ready/stale/reset/insufficient | `UI_INTELLIGENCE_*`, M3 acceptance | Evidence story theo nhịp đọc | `WIRED` |
| Thấu hiểu | Reset baseline | Button + confirm | `resetM3Baseline` | reset, historical snapshot preserved | `UI_BASELINE_RESET_*` | Secondary action gần provenance | `WIRED` |
| Báo cáo | Daily/weekly/month/history | Tabs | list/generate reports | empty, missing days, history | `UI_WEEK_*`, `UI_MONTH_*`, `UI_HISTORY_*` | Narrative timeline + time switcher | `WIRED` |
| Báo cáo | Preview/export/delete | Buttons + modal + native dialog | preview/export/delete category IPC | cancel/fail/exported/deleted | `UI_REPORT_*`, export integration | End-of-story actions, preview trước save | `WIRED` |
| Privacy | Consent và local/network truth | Toggle/status | privacy summary + withdraw | granted/skipped/UNKNOWN | UI privacy assertions | Persistent utility entry + privacy ledger | `WIRED` |
| Privacy | Inventory, export, reset, delete hai bước | Inventory cards/actions | inventory/export/reset/delete IPC | counts, partial/failed/deleted | `UI_DATA_*`, `UI_DELETE_*` | Plain-language inventory, destructive zone tách biệt | `WIRED` |
| Cài đặt | Reminder/sound/quiet/reduced motion | Toggle/time fields | get/update preferences | saved/error/disabled | `UI_SETTINGS_*`, `UI_QUIET_HOURS_*` | Grouped settings, autosave status cố định | `WIRED` |
| Cài đặt | Theme/camera/calibration/retention | Disabled selects/buttons | Không có use case khả dụng đầy đủ | disabled by policy | static/UI evidence | Vẫn hiển thị có lý do, không giả handler | `DISABLED_BY_POLICY` |
| Design Lab cũ | Living Aurora reference | Dev route riêng | demo renderer only | demo states | `acceptance:living-aurora` | Giữ nguyên cho tới khi owner quyết định archive | `PLACEHOLDER`, không production |

## Art direction 1: Trường Tiêu Cự

**Experience thesis:** EyeMate như một trường quang học yên tĩnh, nơi hành động và evidence dần nét lên khi dữ liệu đủ.

- Palette: Graphite `#171A1F`, Carbon `#232831`, Fog `#E9EDF2`, Slate `#8C96A4`, Rule `#3A414D`, Vermilion accent `#E45B43`.
- Typography: sans humanist local, ưu tiên Atkinson Hyperlegible nếu license/bundle gate đạt; IBM Plex Mono cho số và version. Fallback giữ Segoe UI Variable.
- Layout: top navigation, một focus corridor lệch trục; nội dung chính nằm trên các plane gần/xa thay vì card grid.
- Signature: Focus Ribbon, một dải quang học mảnh đổi độ nét theo `READY`, `UNKNOWN`, `STALE`, `LOW_QUALITY`; không biểu diễn sức khỏe.
- Navigation: top rail một dòng; Privacy và Settings ở utility rail luôn thấy.
- Metrics: số/unit/confidence nằm inline trên ribbon với chú thích evidence; không có progress track nền.
- Mascot/companion: không mascot. Personality đến từ chuyển động focus và giọng văn; giảm rủi ro blob/robot generic.
- Motion: ribbon hội tụ 180-240 ms khi state đổi; dừng hoàn toàn trong active focus và khi cửa sổ hidden.
- Home: lời chào + một action chính, ribbon biểu diễn dữ liệu hiện có/thiếu.
- Checkup: hành trình theo các focus planes, survey-only escape luôn nhìn thấy.
- Companion: timer tĩnh ở tâm corridor, nudge đi vào từ mép gần action.
- Insight/report: evidence đặt theo depth, provenance và limitation không bị đẩy xuống cuối.

```text
[EyeMate]  Hôm nay  Khám mắt  Đồng hành  Thấu hiểu  Báo cáo  [Privacy] [Cài đặt]

   Chào bạn. Hôm nay mình bắt đầu từ đâu?
   [ Bắt đầu phiên ]   Khám mắt

          near plane ===== Focus Ribbon ===== far plane
          phiên gần nhất     chưa đo camera     báo cáo
```

- Accessibility/performance risk: blur/depth dễ giảm contrast hoặc tốn GPU; chỉ dùng opacity/transform, blur tĩnh nhỏ và luôn có text state.
- Vì sao riêng EyeMate: near/far, focus và quality state là cấu trúc điều hướng, không phải trang trí.
- Vì sao không generic wellness: không orb, không streak, không health score, không card grid.

## Art direction 2: Nhật Ký Dư Ảnh

**Experience thesis:** EyeMate như một cuốn nhật ký quan sát có cấu trúc, giúp người dùng đọc lại dấu vết thói quen mà không bị chấm điểm.

- Palette: Negative `#17191F`, Ink `#22262F`, Silver `#E5E9EF`, Mist `#A0A8B5`, Rule `#383E49`, Cobalt accent `#526EE8`.
- Typography: Atkinson Hyperlegible local candidate cho body/display; IBM Plex Mono cho số, timestamp, confidence. Tất cả font phải bundle local cùng license trước Design Lab.
- Layout: editorial narrative bất đối xứng; cột chính là câu chuyện, lề phải là evidence/provenance; card chỉ dùng cho dialog hoặc vùng thật sự elevated.
- Signature: Afterimage Trace, hai contour mảnh lệch nhẹ. Chúng trùng nhau khi state ổn định, tách có nhãn khi `UNKNOWN/STALE`, đứt đoạn khi thiếu data.
- Navigation: top text rail; route hiện tại được nhấn bằng contour underline; Privacy và Settings là hai utility button đầy đủ label.
- Metrics: viết thành câu có số inline, unit và confidence ở lề; chart nhỏ chỉ xuất hiện khi đủ evidence.
- Mascot/companion: không mascot production. Companion presence đến từ lời nhắc, nhịp khoảng trắng và Afterimage Trace. Lumi cũ tiếp tục là `ART_PLACEHOLDER` trong lab cũ, không tự nhập vào direction này.
- Motion: contour hội tụ một lần khi route/state thay đổi; paper sections fade/shift 8 px; active Companion không có ambient loop.
- Home: một lời chào, một quyết định tiếp theo, sau đó là nhật ký gần nhất và dữ liệu còn thiếu.
- Checkup: result như personal evidence letter, chia `đã ghi nhận`, `chưa đo`, `giới hạn`, `bước tiếp theo`.
- Companion: timer lớn nhưng không phát sáng; pause làm trace tách và thêm text, không chỉ đổi màu.
- Insight/report: timeline đọc từ observation tới pattern, confidence, limitation và action.

```text
[EyeMate]  Hôm nay  Khám mắt  Đồng hành  Thấu hiểu  Báo cáo        Privacy  Cài đặt

 Chào bạn.                       DẤU VẾT GẦN NHẤT
 Bạn muốn bắt đầu nhẹ nhàng       Phiên 47 phút
 từ một phiên hay checkup?        Camera: NOT_MEASURED
 [ Bắt đầu phiên ]  Khám mắt      Confidence: chưa đủ

 -------------------- afterimage trace --------------------
 Hôm nay             Dữ liệu thiếu                 Bước tiếp theo
```

- Accessibility/performance risk: hierarchy editorial có thể làm action phụ bị quá kín; cần keyboard order, landmark và responsive single-column rõ.
- Vì sao riêng EyeMate: afterimage, focus alignment và evidence margin gắn trực tiếp với cách nhìn và dữ liệu có giới hạn.
- Vì sao không generic wellness: không dùng ring score, streak, pastel self-care hoặc mascot dễ thương; bố cục giống evidence journal hơn dashboard.

## Art direction 3: Khoảng Nhìn

**Experience thesis:** EyeMate tạo các không gian gần và xa để người dùng cảm nhận chuyển đổi giữa tập trung, nghỉ và nhìn lại evidence.

- Palette: Mulberry Neutral `#251F2B`, Deep Plum `#332B39`, Pale Lilac `#EEEAF1`, Ash `#A89FAC`, Rule `#4B414F`, Saffron accent `#F0A62B`.
- Typography: sans grotesk có hình khối rõ cho display, humanist sans cho body; chỉ chọn font sau local license gate.
- Layout: hai vùng `near` và `far` thay đổi tỷ lệ theo route. Home thiên far/whitespace; Checkup thiên near/guidance; Reports cân bằng hai vùng.
- Signature: Accommodation Gate, một khe focus hình học mở/khép theo task và trạng thái; luôn có text tương ứng.
- Navigation: compact top rail; utility dock cố định trong titlebar content region, không đè Electron drag region.
- Metrics: gắn trên hai mặt phẳng near/far như annotation; không dùng tile lặp.
- Mascot/companion: một dấu gấp quang học nhỏ có silhouette riêng chỉ xuất hiện ở nudge/privacy state. Nếu dựng, phải gắn `ART_PLACEHOLDER` và có static form.
- Motion: plane chuyển tỷ lệ chậm 220 ms khi route đổi; Accommodation Gate phản hồi action, không loop trong focus.
- Home: far plane chứa lời chào và action; near plane chứa context gần nhất.
- Checkup: từng bước đi qua gate, back/cancel/fallback không bị giấu.
- Companion: near plane co lại để timer có không gian tĩnh.
- Insight/report: near = evidence chi tiết, far = pattern/limitation theo thời gian.

```text
[EyeMate] [Hôm nay Khám mắt Đồng hành Thấu hiểu Báo cáo] [Privacy] [Cài đặt]

  FAR: lời chào và hướng đi tiếp theo       | NEAR: phiên gần nhất
                                            | camera đang tắt
         < Accommodation Gate >             | dữ liệu còn thiếu
```

- Accessibility/performance risk: split planes dễ tạo reading order không tự nhiên và thu hẹp quá mức ở 1024 px; mobile/zoom phải collapse về một cột.
- Vì sao riêng EyeMate: accommodation và near/far là cấu trúc không gian xuyên route.
- Vì sao không generic wellness: không phải dashboard, hospital portal hay dark-tech HUD; signature xuất phát từ thay đổi tiêu cự.

## Taste critique và revision

### Trường Tiêu Cự

- HeartMate/SleepMate vẫn có thể dùng một ribbon, nên bản đầu chưa đủ riêng.
- Revision: ribbon bắt buộc có near/far anchors, quality interruption và explicit `NOT_MEASURED`; không dùng như progress score.
- Rủi ro bị hiểu là productivity tool nếu timer lấn át evidence. Home và Reports phải giữ limitation/provenance trong hierarchy đầu.
- Khả thi offline và nhẹ nếu không dùng blur lớn hoặc WebGL.

### Nhật Ký Dư Ảnh

- Đổi tên thành sản phẩm khác làm afterimage/focus alignment mất ý nghĩa, nên specificity tốt.
- Không có logo vẫn nhận ra chủ đề vision qua contour alignment, lề evidence và ngôn ngữ focus, không cần eyeball literal.
- Revision: tránh paper/serif cliché bằng dark silver theme, humanist sans và cobalt đơn sắc; bỏ hoàn toàn mascot và decorative grain nặng.
- Trust tốt nhất vì result/checkup/report đọc như evidence letter, không như điểm sức khỏe.
- Khả thi nhất với CSS Grid, pseudo-element và transform/opacity.

### Khoảng Nhìn

- Concept accommodation rất riêng nhưng plane split có thể giống meditation/focus app.
- Revision: mỗi plane phải mang semantics `evidence hiện tại` và `time window`, không dùng cảnh quan hoặc ambient illustration.
- Signature mạnh nhất về originality nhưng reading order, 1024 px và screen reader cần nhiều bằng chứng hơn.
- Mascot fold có nguy cơ thành game-like; chỉ giữ như option, không là lựa chọn mặc định.

## Rubric

Điểm 0-10, tổng đã áp dụng trọng số.

| Direction | EyeMate specificity 25% | Emotional companionship 20% | Functional clarity 20% | Originality/restraint 15% | Accessibility 10% | Electron feasibility 10% | Tổng |
|---|---:|---:|---:|---:|---:|---:|---:|
| Trường Tiêu Cự | 9.2 | 8.4 | 8.7 | 8.9 | 8.6 | 9.1 | 8.83 |
| Nhật Ký Dư Ảnh | 9.5 | 9.0 | 9.2 | 9.1 | 9.3 | 9.0 | **9.21** |
| Khoảng Nhìn | 9.3 | 8.7 | 8.4 | 9.4 | 7.9 | 8.4 | 8.79 |

## Direction đề xuất: Nhật Ký Dư Ảnh

Direction này đạt cân bằng tốt nhất giữa specificity, cảm giác đồng hành, clarity và khả năng bảo toàn behavior. Nó thay mental model từ dashboard sang evidence journal mà không cần mascot, WebGL, ảnh mạng hoặc framework mới.

### Token, type và shape plan

- Một dark theme duy nhất trong Design Lab, không tự mở light-theme setting.
- Cobalt là accent duy nhất; warning/error giữ semantic color nhưng không trở thành brand accent.
- Radius rule: sheet/dialog 16 px, control 8 px, không pill trừ status có semantics.
- Spacing theo nhịp 4/8/12/16/24/32/48; không thêm token trùng nghĩa.
- Atkinson Hyperlegible và IBM Plex Mono chỉ được bundle sau khi xác minh file, license và package delta. Nếu chưa đạt gate, Design Lab dùng Segoe UI Variable/system fallback và ghi limitation.

### Layout plan

- Top navigation một dòng ở 1100 px; 1024 px dùng label ngắn hiện hữu, không ẩn route chính.
- Cột narrative chính và evidence margin; dưới 900 px collapse thành một cột theo DOM order.
- Privacy và Settings luôn có label, không chỉ icon.
- Home không dùng metric grid. Checkup giữ state machine. Companion ưu tiên timer và controls. Intelligence/Reports dùng narrative timeline. Privacy/Settings dùng grouped ledger, không admin cards.

### Signature và motion plan

- Afterimage Trace là bold element duy nhất.
- State: `READY` contours align; `NOT_MEASURED` một contour rỗng kèm text; `INSUFFICIENT_DATA` đứt đoạn; `STALE` lệch có timestamp; `LOW_QUALITY` ngắt tại quality marker; `PRIVACY` đóng contour về local boundary.
- Motion 160-240 ms chỉ để orientation, feedback và state transition; không count-up, parallax, scroll hijack hoặc loop trong active session.
- `prefers-reduced-motion` và setting giảm chuyển động giữ nguyên text/shape state, chỉ bỏ interpolation.

### Visual Gate A plan sau approval

- Route mới dự kiến: `#/design-lab/taste-direction`.
- Full viewport chỉ trong route lab; production sidebar/UI giữ nguyên.
- Demo data rõ ràng; không IPC/camera/database/network.
- Reference bắt buộc: Home, Checkup result fragment, Companion active, Insight/report, Privacy/Settings entries, Afterimage Trace states, reduced motion, keyboard/focus ở 1024x768, 1100x760 và 1280x800.
- Không dùng Living Aurora làm approval ngầm. Lab cũ và evidence cũ được giữ nguyên, không rollout.

## Open questions và owner gates

- Questionnaire direction vẫn chờ quyết định DEQ-5 hay Wellness riêng; Design Lab chỉ dùng neutral placeholder structure, không tạo questionnaire/copy mới.
- Font bundle cần license/source/package review trước khi thêm file.
- Cần Product review cho copy Home có cụm “sức khỏe mắt” và Measurement/Product review cho raw term `EAR`; không gộp vào Taste build.
- Production rollout cần đúng approval phrase riêng sau Visual Gate A.

`WAITING FOR TASTE PLAN APPROVAL`
