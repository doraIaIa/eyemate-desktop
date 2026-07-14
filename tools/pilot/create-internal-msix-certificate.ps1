[CmdletBinding()]
param(
  [string]$OutputDirectory = "",
  [switch]$InstallForCurrentUser,
  [switch]$ExportPrivatePfx
)

$ErrorActionPreference = "Stop"
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $OutputDirectory = Join-Path $repositoryRoot ".pilot\signing" }
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not $resolvedOutput.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "SIGNING_OUTPUT_OUTSIDE_REPOSITORY"
}

$manifestPath = Join-Path $repositoryRoot ".pilot\beta\stage\AppxManifest.xml"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "BETA_MANIFEST_MISSING: run npm run build:msix:beta first"
}
[xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
$publisher = $manifest.Package.Identity.Publisher
if ([string]::IsNullOrWhiteSpace($publisher) -or -not $publisher.StartsWith("CN=")) {
  throw "INVALID_BETA_MANIFEST_PUBLISHER"
}

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$certificate = New-SelfSignedCertificate -Type Custom -KeyUsage DigitalSignature -Subject $publisher `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
  -FriendlyName "EyeMate Beta Internal development certificate"

$cerPath = Join-Path $resolvedOutput "eyemate-beta-internal.cer"
Export-Certificate -Cert $certificate -FilePath $cerPath | Out-Null
$pfxPath = $null
if ($ExportPrivatePfx) {
  $pfxPath = Join-Path $resolvedOutput "eyemate-beta-internal.pfx"
  $password = Read-Host "Nhập mật khẩu mới cho PFX (không lưu trong repository)" -AsSecureString
  Export-PfxCertificate -Cert $certificate -FilePath $pfxPath -Password $password | Out-Null
}

if ($InstallForCurrentUser) {
  Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPeople" | Out-Null
  # TrustedPeople cho cài MSIX; Root cục bộ chỉ phục vụ verify chain của SignTool trên máy build.
  Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
}

[pscustomobject]@{
  status = "INTERNAL_SIGNING_CERTIFICATE_CREATED"
  publisher = $publisher
  thumbprint = $certificate.Thumbprint
  pfxPath = $pfxPath
  publicCertificatePath = $cerPath
  currentUserTrustInstalled = [bool]$InstallForCurrentUser
  currentUserRootTrustInstalled = [bool]$InstallForCurrentUser
  nextCommand = "`$env:EYEMATE_SIGNING_CERT_SHA1='$($certificate.Thumbprint)'; node tools/pilot/sign-beta-msix.mjs .pilot/beta/eyemate-beta.msix"
} | ConvertTo-Json -Compress
