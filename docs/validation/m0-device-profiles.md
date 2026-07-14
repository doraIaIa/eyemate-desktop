# M0 Device Profiles

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: not-required, security: not-required }
last_reviewed: 2026-07-14
related: [D-008, NFR-M0-001, NFR-M0-002, NFR-M0-003, AC-M0-012, AC-M0-020]
```

## Mục đích và trạng thái

Tài liệu này định nghĩa schema và target profile để hai shell candidate được đo trên điều kiện tương đương. Đây chưa phải inventory máy thật và không phải performance budget. `DP-DEV` không đại diện cho người dùng phổ biến; mọi cấu hình chưa được quan sát hoặc chưa được Tech + QA duyệt giữ `TBD`.

## Schema bắt buộc

| Field | Ý nghĩa và định dạng | Bắt buộc khi chạy |
|---|---|---:|
| `deviceProfileId`, `profileVersion` | ID dưới đây và phiên bản semver của profile | Có |
| `profileKind` | `TARGET` hoặc `OBSERVED` | Có |
| `osEdition`, `osVersion`, `osBuild` | Windows edition/version/build | Có |
| `cpuModel`, `physicalCores`, `logicalCores` | Model và số core | Có |
| `ramGiB` | RAM vật lý, GiB | Có |
| `gpuModel`, `gpuDriverVersion` | GPU và driver | Có; `NONE` chỉ khi đã xác minh |
| `architecture` | `x64` hoặc `ARM64` | Có |
| `storageType`, `freeSpaceGiB` | HDD/SATA SSD/NVMe và dung lượng trống đầu run | Có |
| `displayCount`, `displayResolution`, `displayScalingPercent` | Số màn hình, độ phân giải, scaling | Có |
| `webcamPlacement`, `webcamModel`, `webcamResolution`, `webcamFps`, `webcamDriverVersion` | Internal/external và camera/driver | Có cho workload camera |
| `powerMode`, `acPower` | Chế độ nguồn và có cắm điện hay không | Có |
| `networkMode` | `BLOCKED`, `OFFLINE`, `CONTROLLED_ONLINE` | Có |
| `packageType`, `channel`, `packageIdentity` | MSIX/unpackaged, internal channel, test identity | Có |
| `observedAtUtc`, `inventoryCommand`, `evidenceRef` | Thời điểm, command và artifact inventory | Có cho `OBSERVED` |
| `notes` | Hạn chế, VM/physical, thermal hoặc driver anomaly | Có thể rỗng |

Kính, ánh sáng, pose và occlusion là điều kiện workload, không phải thuộc tính nhận dạng của device profile hay người thử.

## Target profile register

| ID | Vai trò | Trạng thái | Target đề xuất | Owner | Gate/deadline |
|---|---|---|---|---|---|
| `DP-DEV` | Máy phát triển hiện tại để smoke và kiểm tra harness | `TBD_OBSERVED` | Không đặt cấu hình mục tiêu; phải inventory máy hiện tại bằng schema trên | Tech | Trước lần chạy dry-run đầu tiên của T-M0-002 |
| `DP-MIN` | Cấu hình Windows thấp nhất dự kiến hỗ trợ | `PROPOSED` | Windows 11, architecture/CPU/RAM/GPU/storage/display/camera đều `TBD` | Tech + QA | Duyệt target trước benchmark; gán máy thật trước workload chính thức |
| `DP-TYP` | Cấu hình người dùng phổ biến | `PROPOSED` | Windows 11, thông số phần cứng và camera `TBD`; không suy từ `DP-DEV` | Product + Tech + QA | Product cung cấp rationale, Tech + QA duyệt trước benchmark |
| `DP-HIGH` | Cấu hình cao làm đối chứng và phát hiện bottleneck | `PROPOSED` | Windows 11, thông số phần cứng `TBD`; không dùng làm pass gate tối thiểu | Tech + QA | Gán máy đối chứng trước benchmark chính thức |
| `DP-EDGE` | Camera/driver/display geometry bất lợi | `PROPOSED` | Ít nhất một biến bất lợi đã ghi: external webcam, multi-display/scaling hoặc driver khác; giá trị cụ thể `TBD` | QA + Validation | Chọn sau khi review rủi ro camera, trước workload camera chính thức |

Rationale cho `DP-MIN`/`DP-TYP` hiện chỉ là nhu cầu bao phủ biên thấp và trường hợp phổ biến. Không có dữ liệu người dùng hoặc hardware inventory đủ để chốt CPU/RAM/GPU cụ thể.

## Target và observed machine

- Target profile mô tả lớp thiết bị cần bao phủ; observed machine là snapshot bất biến theo `observedAtUtc` và `evidenceRef`.
- Một máy thật chỉ đại diện target khi Tech + QA ghi mapping và sai khác. Không tự map vì “gần giống”.
- Driver/OS/package/power mode thay đổi tạo observed snapshot mới; không sửa record cũ.
- Nếu không có máy đại diện, workload tương ứng là `ABORTED` với `DEVICE_PROFILE_UNAVAILABLE`; không thay bằng `DP-DEV` âm thầm.

## Proposed inventory commands — chưa xác minh

```powershell
Get-ComputerInfo
Get-CimInstance Win32_Processor,Win32_VideoController,Win32_ComputerSystem,Win32_DiskDrive
Get-PnpDevice -Class Camera
```

Các command này chỉ là đề xuất capability, chưa chạy và có thể cần điều chỉnh quyền/phiên bản Windows. Artifact inventory phải scrub username, serial number, device instance ID và đường dẫn cá nhân trước khi lưu.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | Tech | `NOT_REVIEWED` | — | Chưa duyệt target và chưa có observed inventory | Khi năm profile có owner/mapping plan |
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | QA | `NOT_REVIEWED` | — | Chưa xác nhận coverage camera/driver/geometry | Sau Tech review, ở lượt review riêng |

