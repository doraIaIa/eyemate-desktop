# M0 Evidence Tooling

`T-M0-003` chỉ chứa tooling dependency-free cho schema evidence; không mở camera, không gọi mạng và không tạo benchmark artifact.

```text
node tools/m0/validate-evidence-schema.mjs tools/m0/fixtures/valid-run.jsonl
node tools/m0/run-fixture-tests.mjs
```

Validator chỉ đọc JSONL, in reason code tối thiểu và không echo record/input. Fixture là dữ liệu synthetic, không chứa raw frame/video/landmark, dữ liệu sức khỏe, đường dẫn người dùng hay secret.

Phạm vi hiện tại: contract run record `m0-benchmark-run/0.3.0`, trạng thái ba chiều, count/coverage metric, duplicate metric/artifact reference, reference path tương đối và forbidden field/path cơ bản. Reference từ chối path tuyệt đối/UNC/URI/`..` và segment profile `user(s)`/`profile(s)`. Forbidden key được normalize casing và dấu phân cách, nên bắt các biến thể `rawFrame`, `raw_frame`, `videoFrame`, `landmarks`, `rawLandmarks` trong denylist.

Validator chỉ dùng `node:fs` để đọc file. Fixture runner dùng `node:child_process` chỉ để kiểm tra exit code của CLI; không có HTTP/network API, không ghi evidence và không tạo child process từ validator.

Nó không thay scanner sink runtime, scrubber, checksum-manifest generator, network capture hoặc privacy review sau khi có artifact thật.
