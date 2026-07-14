# M0 Evidence Tooling

`T-M0-003` chỉ chứa tooling dependency-free cho schema evidence; không mở camera, không gọi mạng và không tạo benchmark artifact.

```text
node tools/m0/validate-evidence-schema.mjs tools/m0/fixtures/valid-run.jsonl
node tools/m0/run-fixture-tests.mjs
node tools/m0/scan-evidence-artifact.mjs run-record tools/m0/fixtures/safe-artifact.json
node tools/m0/run-scanner-fixture-tests.mjs
node tools/m0/generate-evidence-manifest.mjs generate <evidence-root> lists/manifest-input.json manifests/m0-manifest.json
node tools/m0/generate-evidence-manifest.mjs verify <evidence-root> manifests/m0-manifest.json --strict
node tools/m0/run-manifest-fixture-tests.mjs
node tools/m0/initialize-run-directory.mjs init <evidence-root> '<metadata-json>' --dry-run
node tools/m0/run-initializer-fixture-tests.mjs
node tools/m0/collect-measurement-tool-inventory.mjs collect <evidence-root> artifacts/measurement-tool-inventory.json
node tools/m0/run-tool-inventory-fixture-tests.mjs
```

Validator chỉ đọc JSONL, in reason code tối thiểu và không echo record/input. Fixture là dữ liệu synthetic, không chứa raw frame/video/landmark, dữ liệu sức khỏe, đường dẫn người dùng hay secret.

Phạm vi hiện tại: contract run record `m0-benchmark-run/0.3.0`, trạng thái ba chiều, count/coverage metric, duplicate metric/artifact reference, reference path tương đối và forbidden field/path cơ bản. Reference từ chối path tuyệt đối/UNC/URI/`..` và segment profile `user(s)`/`profile(s)`. Forbidden key được normalize casing và dấu phân cách, nên bắt các biến thể `rawFrame`, `raw_frame`, `videoFrame`, `landmarks`, `rawLandmarks` trong denylist.

Validator chỉ dùng `node:fs` để đọc file. Fixture runner dùng `node:child_process` chỉ để kiểm tra exit code của CLI; không có HTTP/network API, không ghi evidence và không tạo child process từ validator.

Nó không thay scanner sink runtime, scrubber, checksum-manifest generator, network capture hoặc privacy review sau khi có artifact thật.

`scan-evidence-artifact.mjs` chỉ scan artifact text tối đa 1 MiB theo artifact type allowlist. Nó từ chối type không biết, binary, forbidden field/value cơ bản và không echo input. Scanner này là lớp pre-ingest tối thiểu, không thay thế quét sink runtime hoặc scrubber.

`generate-evidence-manifest.mjs` dùng SHA-256 của Node, chỉ nhận list và manifest relative bên trong evidence root; entry bắt buộc nằm dưới `artifacts/`. Trước khi hash, mỗi entry phải qua scanner. Generate ghi manifest bằng temporary file cùng thư mục rồi rename; manifest deterministic không có timestamp, absolute path, username, hostname hoặc machine identifier. Verify thường kiểm hash/size/scanner/schema/path; `--strict` còn từ chối file dưới `artifacts/` không có trong manifest. Exit `0` là hợp lệ, `1` là reject/invalid contract, `2` là usage hoặc input/root không đọc được. SHA-256 chỉ chứng minh integrity sau khi manifest được tạo; nó không phải chữ ký số hay immutable attestation.

`collect-measurement-tool-inventory.mjs` chỉ chạy allowlist probe local, cố định cho Node, WPR, Xperf, Logman và Wevtutil; dùng `spawnSync(..., { shell: false })`, timeout ngắn và không ghi stdout/stderr thô, đường dẫn executable, hostname hay username. Đây là ngoại lệ `node:child_process` hẹp duy nhất ngoài fixture runner: không nhận executable/argument từ người dùng và không mở network/camera. Artifact `resource-trace` được scanner kiểm trước khi ghi atomically dưới `artifacts/`; component symlink/junction bị từ chối. Inventory chỉ chứng minh khả dụng và phiên bản được chuẩn hoá nếu probe an toàn trả về được; egress và auto-update luôn `NOT_EVALUATED_OFFLINE_ONLY`, không phải kết quả network. Exit `0` là tạo thành công, `1` là từ chối contract/path, `2` là usage, root/output hoặc safe probe không đọc được.

`evaluate-tool-egress-gate.mjs` là gate fail-closed: inventory `NOT_EVALUATED_OFFLINE_ONLY` bị chặn bằng `BLOCKED_UNVERIFIED_EGRESS`. Gate không thực hiện capture và không tự tạo evidence `VERIFIED_*`; network trace được phê duyệt riêng vẫn là bắt buộc trước benchmark camera/network.

`inspect-static-egress.mjs` recursively inspects repo-local production `tools/m0/*.mjs` (fixture runners are excluded) for network modules, APIs and URL literals. A clean result is static evidence about this source set only; it does not prove the behavior of WPR, Windows or any other system tool.
