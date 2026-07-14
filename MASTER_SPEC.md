# EyeMate V2 — Master Specification

```yaml
document_version: 1.0.0-draft
decision_status: proposed
release_scope: m0-m5
owner: product-owner
last_reviewed: 2026-07-14
```

## 1. Tuyên bố sản phẩm

EyeMate là ứng dụng desktop local-first giúp người trưởng thành sử dụng màn hình hiểu triệu chứng khó chịu ở mắt và các mẫu hành vi thị giác của chính họ; theo dõi khoảng cách, nghỉ ngơi và tải thị giác khi dữ liệu đủ chất lượng; đưa can thiệp hành vi có giải thích; và hỗ trợ người dùng tự chuẩn bị bản tóm tắt khi cần trao đổi với chuyên gia.

EyeMate là công cụ wellness và self-tracking. EyeMate không chẩn đoán, điều trị, kê đơn, đo bệnh lý nhãn khoa hoặc biến webcam thành xác suất mắc bệnh.

## 2. Người dùng chính

- Người trưởng thành học tập hoặc làm việc nhiều với màn hình.
- Ưu tiên người dùng cá nhân trên Windows, muốn kiểm soát dữ liệu và có thể sử dụng không cần tài khoản.
- Trẻ em, người cần cấp cứu, workflow lâm sàng và đánh giá nhân viên nằm ngoài MVP.

## 3. Kết quả người dùng cần đạt

1. Hiểu tín hiệu nào được quan sát và tín hiệu nào không đo được.
2. Nhận kết quả theo cấu trúc `evidence → pattern → confidence → missing data → action`.
3. Biết khi nào phép đo không đủ tin cậy.
4. Thực hiện một hành động nhỏ phù hợp mà không bị ép hoặc gây hoảng sợ.
5. Giữ quyền kiểm soát camera, dữ liệu, export và deletion.

## 4. Invariant cấp sản phẩm

- `UNKNOWN`, `NOT_MEASURED` và missing data không được biến thành `NORMAL` hoặc `0`.
- Data confidence không phải xác suất bệnh.
- Một frame, một tín hiệu hoặc một model output không tạo medical conclusion.
- Safety Gate dùng rule và nội dung đã duyệt; model không tự tạo red flag.
- Camera denial không chặn survey-only checkup và companion không camera.
- Raw frame/video chỉ tồn tại trong RAM trong luồng mặc định.
- Report cũ phải giữ semantics của algorithm/schema version lúc tạo.
- Người dùng luôn xem preview trước export/share.
- Enterprise không được nhận record, symptom, report hoặc risk cấp cá nhân.

Chi tiết thuật ngữ và invariant: [`docs/domain/glossary-and-invariants.md`](docs/domain/glossary-and-invariants.md).

## 5. Capability map

| Capability | Mục tiêu | Scope |
|---|---|---|
| Onboarding/consent | Hiểu giới hạn và kiểm soát camera | M1 |
| Safety Gate | Dừng self-check và hướng dẫn phù hợp khi rule kích hoạt | M1, cần clinical review |
| Symptom checkup | Ghi nhận triệu chứng có cấu trúc, không chẩn đoán | M1 |
| Camera quality | Chỉ đo khi dữ liệu đủ chất lượng | M0–M1 |
| Distance zone | Phân loại khoảng cách cá nhân; chỉ hiển thị cm sau validation | M0–M2 |
| Checkup report | Evidence, missing data và action | M1 |
| Work Companion | Session, break nudge, camera tùy chọn | M2 |
| Personal baseline | So sánh người dùng với chính họ, có trạng thái learning/stale | M3 |
| Patterns/VLI | Tổng hợp rule-based, versioned, biết từ chối | M3 |
| Trends/export | Daily/weekly và professional export | M2–M3 |
| Public distribution | Signed package, update, migration, recovery | M4 |
| Enterprise aggregate | Cohort-only, privacy threshold | M5/post-MVP |

## 6. Phạm vi phát hành đã tối ưu

### M0 — Architecture POC

- So sánh Electron/Tauri trên camera, local MediaPipe/ONNX asset, SQLite, overlay nếu còn cần, MSIX, startup/RAM và CI reproducibility.
- Chứng minh raw frame không đi vào persistence/log.
- Chứng minh clean install, local data path và schema migration tối thiểu.

**Exit:** ADR chọn shell/storage; POC có số đo; không rewrite dựa trên sở thích.

### M1 — Contest/Checkup MVP

- Onboarding và consent camera tách biệt.
- Safety Gate với nội dung đã duyệt.
- Symptom Profile có version và survey-only path.
- Camera Quality Gate; blink/distance chỉ xuất khi đủ quality.
- Distance zone qua calibration tối thiểu; không bắt buộc hiển thị cm.
- Checkup report theo evidence/pattern/missing/action.
- Local storage, export/delete cơ bản và offline.

**Không thuộc M1:** adaptive ML, cloud, account, weekly/monthly trend đầy đủ, enterprise, share link, auto-update phức tạp.

### M2 — Personal pilot

- Work Companion, cooldown, snooze/dismiss và daily summary.
- Distance benchmark và false-alert analysis.
- Professional Summary xuất file cục bộ.
- Beta packaging, migration/recovery và usability pilot.

### M3 — Personalization

- Personal baseline theo context và readiness evidence.
- Pattern Engine + VLI rule-based, versioned.
- Weekly Digest; monthly chỉ khi đủ thời gian dữ liệu.
- Nudge adaptation chỉ học timing/content/cooldown, không tự hạ safety threshold.

### M4 — Public release

- Accessibility/performance budget đạt.
- Signed MSIX, Store channel, update/migration/rollback và incident runbook.
- Privacy policy khớp implementation và validation report công khai phù hợp.

### M5 — Enterprise

Chỉ bắt đầu sau M4 và privacy/legal review. Không tái sử dụng dữ liệu cá nhân cho doanh nghiệp. Thiết kế aggregate phải chống lọc xuống nhóm nhỏ và tái nhận diện.

## 7. Quyết định kỹ thuật nền

- Kiến trúc mặc định: modular monolith với ports/adapters.
- Domain Core không phụ thuộc DOM, desktop shell, SDK camera hoặc database cụ thể.
- Local storage mục tiêu: SQLite, WAL, transaction, migration version; khóa trong OS credential store. Lựa chọn SQLCipher/field encryption cần ADR sau POC.
- ML không thuộc critical path M1. Rule-based/heuristic chỉ được dùng khi semantics và version hiển thị rõ.
- Không dùng event bus cho mọi lời gọi. Dùng application use case đồng bộ; domain event chỉ cho fact cần nhiều consumer hoặc cần retry, consumer phải idempotent.
- Asset cốt lõi phải local; chức năng cá nhân không phụ thuộc CDN.

## 8. Cổng trước khi code

- [ ] Intended use/claims/non-goals được product và clinical owner duyệt.
- [ ] Safety Gate owner và content catalogue được chốt.
- [ ] Questionnaire, bản dịch, license và scoring được chốt.
- [ ] M1 report wireframe được duyệt trước khi tối ưu input.
- [ ] Data contract, retention, consent và deletion semantics được duyệt.
- [ ] M0 POC plan và tiêu chí chọn shell/storage được chốt.
- [ ] V1 được đóng băng, backup và audit.

## 9. Cổng trước pilot

- [ ] Survey-only path hoàn chỉnh.
- [ ] Permission denied, camera busy, low quality và offline không làm hỏng session.
- [ ] Không lưu/gửi raw frame theo test.
- [ ] Distance/blink chỉ bật ở mức benchmark cho phép.
- [ ] Consent withdrawal, export, delete và recovery hoạt động.
- [ ] Safety/action content đã duyệt.
- [ ] Crash/log scrub và migration fixtures qua.

## 10. Open decisions chặn implementation

| ID | Quyết định | Owner | Chặn |
|---|---|---|---|
| D-001 | Tên thương mại | Product | Branding, không chặn domain |
| D-003 | Electron hay Tauri | Tech | Repository scaffold sau M0 |
| D-004 | Questionnaire/license/bản dịch | Clinical + Product | M1 checkup |
| D-005 | Safety Gate clinical owner | Product | M1 pilot |
| D-006 | SQLCipher hay field encryption | Security + Tech | Persistence final |
| D-007 | Baseline readiness | Data + Product | M3 |
| D-008 | Device profiles/performance budget | Tech + QA | M4 |
| D-009 | Distance/blink quality goals | Validation owner | Hiển thị số/score |
| D-013 | Retention và deletion semantics cuối | Privacy + Product | DB schema final |

Không xóa câu hỏi mở để tài liệu trông hoàn chỉnh. Mỗi quyết định được chốt phải có ADR hoặc decision record và rationale.

## 11. Nguồn chi tiết

- Product: `docs/product/`
- Safety: `docs/safety/`
- Domain: `docs/domain/`
- Data: `docs/data/`
- Privacy/security: `docs/privacy/`
- Architecture: `docs/architecture/`
- Validation: `docs/validation/`
- Operations: `docs/operations/`
- Feature behavior và acceptance: `specs/`
- Requirement coverage: `docs/requirements/`

