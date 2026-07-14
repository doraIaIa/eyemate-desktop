# M0 Device Profiles

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: required, security: required }
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
| `storageSnapshots` | Danh sách theo vai trò `SYSTEM`/`APP_DATA`/`EVIDENCE`, loại HDD/SATA SSD/NVMe và `freeSpaceBucketGiB`; không lưu drive letter, mount path, volume/device ID hoặc serial | Có |
| `displayCount`, `displayResolution`, `displayScalingPercent` | Số màn hình, độ phân giải, scaling | Có |
| `webcamPlacement`, `webcamModel`, `webcamResolution`, `webcamFps`, `webcamDriverVersion` | Internal/external và camera/driver | Có cho workload camera |
| `powerMode`, `acPower` | Chế độ nguồn và có cắm điện hay không | Có |
| `networkMode` | `BLOCKED`, `OFFLINE`, `CONTROLLED_ONLINE` | Có |
| `packageType`, `channel`, `packageIdentity` | MSIX/unpackaged, internal channel, test identity | Có |
| `observedAtUtc`, `inventoryMethodVersion`, `evidenceRef` | Thời điểm, phiên bản collector allowlisted và artifact inventory đã scrub; không lưu command line/path thô | Có cho `OBSERVED` |
| `notes` | Hạn chế, VM/physical, thermal hoặc driver anomaly | Có thể rỗng |

Kính, ánh sáng, pose và occlusion là điều kiện workload, không phải thuộc tính nhận dạng của device profile hay người thử.

## Inventory minimization và phân loại

- Device snapshot là technical fingerprint nội bộ dù không có tên người dùng. Chỉ reviewer Tech/QA/Privacy/Security và release owner được cấp quyền theo nhu cầu; không publish công khai hoặc đưa vào telemetry.
- Collector dùng allowlist field ở bảng schema. Cấm hostname, username, SID, home/profile path, drive letter/mount path, BIOS/disk/camera serial, device instance/PnP ID, MAC/IP/SSID, account, geolocation và raw command output.
- `deviceSnapshotId` là ID ngẫu nhiên/pseudonymous theo run plan; không hash trực tiếp identifier phần cứng vì hash vẫn có thể liên kết chéo.
- Dung lượng chính xác chỉ được dùng tạm trong RAM cho preflight hard limit. Evidence chỉ giữ bucket đã khóa trong protocol; nếu bucket không đủ cho comparability thì Privacy/Security phải duyệt field thay thế trước collection.
- Camera model/driver và CPU/GPU/OS build chỉ giữ khi cần cho comparability; evidence index phải áp retention/access policy của `m0-evidence-schema.md`.

## Target profile register

| ID | Vai trò | Trạng thái | Target đề xuất | Owner | Gate/deadline |
|---|---|---|---|---|---|
| `DP-DEV` | Máy phát triển hiện tại để smoke và kiểm tra harness | `PARTIAL_OBSERVED` | Snapshot Tech Review bên dưới; camera resolution/FPS, network mode và package identity còn `TBD`, nên chưa đại diện target hoặc run `VALID` | Tech | Hoàn tất field còn thiếu trước dry-run tương ứng |
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

## Observed inventory `DP-DEV` — Tech Review

Quan sát read-only tại `2026-07-14T02:46:00Z`; snapshot này chỉ phục vụ readiness và chưa phải evidence của benchmark.

| Field | Giá trị quan sát |
|---|---|
| `profileKind` | `OBSERVED` |
| `osEdition`, `osVersion`, `osBuild` | Windows 11 Home; `10.0.26200`; build `26200` |
| `cpuModel`, `physicalCores`, `logicalCores` | Intel Core i5-13420H; 8; 12 |
| `ramGiB` | `15.73` |
| `gpuModel`, `gpuDriverVersion` | NVIDIA GeForce RTX 3050 6GB Laptop GPU `32.0.15.9579`; Intel UHD Graphics `32.0.101.6733` |
| `architecture` | `x64` (OS báo `64-bit`) |
| `storageSnapshots` | NVMe SSD; `SYSTEM=128–255 GiB`, `APP_DATA/EVIDENCE=256–511 GiB`; drive letter và mount path không lưu trong readiness record |
| `displayCount`, `displayResolution`, `displayScalingPercent` | 1; 1920×1080; 100% |
| `webcamPlacement`, `webcamModel`, `webcamDriverVersion` | Integrated; Integrated Camera; `5.0.18.176` |
| `webcamResolution`, `webcamFps` | `TBD_NOT_OBSERVED`; không mở camera trong Tech Review |
| `powerMode`, `acPower` | Legion Balance Mode; AC power theo `Win32_Battery.BatteryStatus=2` |
| `networkMode` | `TBD_NOT_CONTROLLED`; không chạy network workload |
| `packageType`, `channel`, `packageIdentity` | `TBD_NOT_APPLICABLE_READINESS`; chưa có candidate package |

Máy này không được tự map sang `DP-MIN`, `DP-TYP`, `DP-HIGH` hoặc `DP-EDGE`. Camera tích hợp không đủ để chạy disconnect vật lý trong `WL-008`; workload đó cần observed machine có external webcam hoặc phương án phần cứng tương đương được QA duyệt.

## Inventory command và field thực dùng

Các command sau đã chạy chỉ đọc. Chỉ các field liệt kê được dùng; không truy vấn/lưu username, serial number hoặc device instance ID.

```powershell
Get-CimInstance Win32_OperatingSystem  # Caption, Version, BuildNumber, OSArchitecture
Get-CimInstance Win32_ComputerSystem  # TotalPhysicalMemory
Get-CimInstance Win32_Processor       # Name, NumberOfCores, NumberOfLogicalProcessors
Get-CimInstance Win32_VideoController # Name, DriverVersion, CurrentHorizontalResolution, CurrentVerticalResolution
Get-PhysicalDisk                      # chỉ dùng MediaType, BusType; không lưu FriendlyName/serial/device ID
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" # chỉ bucket FreeSpace theo vai trò; không lưu DeviceID/drive letter
Get-CimInstance Win32_PnPSignedDriver # lọc DeviceClass CAMERA/IMAGE; DeviceName, DriverVersion
[System.Windows.Forms.Screen]::AllScreens # Bounds, Primary
Get-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics' -Name AppliedDPI
Get-CimInstance Win32_Battery         # BatteryStatus, EstimatedChargeRemaining
powercfg /getactivescheme
```

`Get-ComputerInfo` và `Get-PnpDevice -Class Camera` không được dùng làm evidence vì output rộng hơn nhu cầu tối thiểu. Artifact inventory machine-readable chưa được tạo; collector allowlist/scrubber/path/checksum vẫn chờ task được phép sau readiness review. Không được lưu raw output của các command trên làm evidence.

## Proposed inventory commands — chưa xác minh cho automation

```powershell
Get-ComputerInfo
Get-CimInstance Win32_Processor,Win32_VideoController,Win32_ComputerSystem,Win32_DiskDrive
Get-PnpDevice -Class Camera
```

Các command này chỉ là đề xuất capability, chưa chạy và có thể cần điều chỉnh quyền/phiên bản Windows. Artifact inventory phải scrub username, serial number, device instance ID và đường dẫn cá nhân trước khi lưu.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | Tech | `CHANGES_REQUIRED` | 2026-07-14 | `DP-DEV` mới partial observed; bốn target và mapping máy thật chưa được khóa | Khi target/mapping plan có evidence và field run-critical hoàn tất |
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | QA | `CHANGES_REQUIRED` | 2026-07-14 | Target/mapping máy thật chưa khóa; `DP-DEV` thiếu camera resolution/FPS, controlled network và package identity; không có external camera cho `WL-008` | Khi mapping/profile run-critical có evidence và version/checksum khóa trước result |
| `m0-device-profiles.md` | `0.2.0-proposed` | Tech | Privacy + Security | `CHANGES_REQUIRED` | 2026-07-14 | Field allowlist/minimization đã bổ sung nhưng collector/scrubber, access control, retention và negative fixture loại identifier chưa tồn tại hoặc chưa được xác minh | Khi artifact machine-readable chứng minh không có username/path/serial/device identifier và lifecycle evidence được duyệt |
