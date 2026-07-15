[CmdletBinding()]
param(
  [Parameter()]
  [string]$PackagePath = (Join-Path $PSScriptRoot "..\..\.m1\msix\eyemate-m1.msix")
)

$ErrorActionPreference = "Stop"
$resolvedPackage = (Resolve-Path -LiteralPath $PackagePath).Path
$windowsBuild = [Environment]::OSVersion.Version.Build

if ($windowsBuild -lt 22000) {
  throw "UNSIGNED_MSIX_REQUIRES_WINDOWS_11: build hiện tại là $windowsBuild. Hãy dùng package đã ký trên Windows 10."
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedPackage
if ($signature.Status -ne "NotSigned") {
  throw "PACKAGE_IS_NOT_UNSIGNED: trạng thái chữ ký là $($signature.Status)."
}

Write-Host "Đang cài engineering demo MSIX unsigned: $resolvedPackage"
Write-Host "Windows có thể yêu cầu PowerShell chạy với quyền Administrator vì package chứa executable."
Add-AppxPackage -Path $resolvedPackage -AllowUnsigned
Write-Host "EYEMATE_UNSIGNED_MSIX_INSTALL_COMPLETE"
