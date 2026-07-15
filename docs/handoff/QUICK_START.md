# Quick Start cho developer mới

## 1. Clone và cài

```powershell
git clone https://github.com/doraIaIa/eyemate-desktop.git
cd eyemate-desktop
node --version
npm --version
npm ci
```

Khuyến nghị Node.js 24.x, npm 11.x, Windows x64. Không cần Node trên máy chỉ dùng để thử cài MSIX.

## 2. Mở app

```powershell
npm run dev
```

App mở production Clarity Grid tại `#/home`. Không cần DevTools Console. `Ctrl+Shift+D` mở DevPanel vì `npm run dev` truyền explicit unpackaged flag.

## 3. Kiểm tra trước khi sửa

```powershell
git status --short
git diff --stat
git diff --check
npm run typecheck
npm run verify
```

UI chuyên biệt:

```powershell
npm run acceptance:clarity-production
npm run acceptance:dev-panel
npm run acceptance:living-aurora
npm run acceptance:taste-design-lab
```

## 4. Route cần biết

- Production: `#/home`, `#/checkup`, `#/companion`, `#/intelligence`, `#/reports`, `#/privacy`, `#/settings`.
- Reference only: `#/design-lab/living-aurora`, `#/design-lab/taste-direction`.

## 5. Camera

Timer Only và survey-only không cần camera. Settings calibration cần consent/action rõ ràng. Lệnh real-camera gate:

```powershell
npm run camera:measure:pilot
```

`CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE` là fail-closed/environment result, không phải quyền hạ threshold.

## 6. Build demo

```powershell
npm run build:demo
```

Artifact `.m1/msix/eyemate-m1.msix` bị ignore. Không commit MSIX, certificate, database, profile calibration, log hoặc camera media. Clean Windows 11 install dùng `tools/m1/install-unsigned-demo-msix.ps1` và cần evidence riêng.
