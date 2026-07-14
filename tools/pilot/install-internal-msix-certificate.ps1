[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory = $true)]
  [string]$CertificatePath,
  [ValidateSet("CurrentUser", "LocalMachine")]
  [string]$Scope = "LocalMachine"
)

$ErrorActionPreference = "Stop"
$certificate = [System.IO.Path]::GetFullPath($CertificatePath)
if (-not (Test-Path -LiteralPath $certificate -PathType Leaf) -or [System.IO.Path]::GetExtension($certificate) -ne ".cer") {
  throw "PUBLIC_CERTIFICATE_REQUIRED"
}
if ($Scope -eq "LocalMachine") {
  $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "ADMINISTRATOR_REQUIRED_FOR_LOCAL_MACHINE_TRUST"
  }
}
$store = "Cert:\$Scope\TrustedPeople"
if ($PSCmdlet.ShouldProcess($store, "Tin cậy public certificate EyeMate beta")) {
  Import-Certificate -FilePath $certificate -CertStoreLocation $store | Out-Null
}
[pscustomobject]@{ status = "PUBLIC_CERTIFICATE_TRUSTED"; scope = $Scope; store = $store } | ConvertTo-Json -Compress
