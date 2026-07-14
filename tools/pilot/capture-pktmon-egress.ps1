[CmdletBinding(SupportsShouldProcess)]
param(
  [ValidateRange(1, 60)]
  [int]$DurationSeconds = 60,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\..\.pilot\egress"),
  [switch]$KeepRawCapture
)

$ErrorActionPreference = "Stop"
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw "ADMINISTRATOR_REQUIRED_FOR_PKTMON" }
$pktmon = Get-Command pktmon.exe -ErrorAction SilentlyContinue
if ($null -eq $pktmon) { throw "PKTMON_NOT_FOUND" }
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not $output.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw "EGRESS_OUTPUT_OUTSIDE_REPOSITORY" }
New-Item -ItemType Directory -Path $output -Force | Out-Null
$etl = Join-Path $output "pktmon-raw.etl"
$text = Join-Path $output "pktmon-raw.txt"

try {
  & $pktmon.Source filter remove | Out-Null
  if (-not $PSCmdlet.ShouldProcess($etl, "Bắt đầu pktmon NIC capture tối đa $DurationSeconds giây")) { return }
  & $pktmon.Source start --capture --comp nics --file-name $etl --file-size 64 | Out-Null
  Start-Sleep -Seconds $DurationSeconds
  $counters = & $pktmon.Source counters --json
  & $pktmon.Source stop | Out-Null
  & $pktmon.Source etl2txt $etl --out $text --brief | Out-Null
  [pscustomobject]@{ status = "PKTMON_CAPTURE_COMPLETE"; durationSeconds = $DurationSeconds; counters = $counters; rawEtl = $etl; rawText = $text; rawMustBeScrubbedBeforeCommit = $true } | ConvertTo-Json -Compress
} finally {
  & $pktmon.Source stop 2>$null | Out-Null
  if (-not $KeepRawCapture) {
    Remove-Item -LiteralPath $etl, $text -Force -ErrorAction SilentlyContinue
  }
}
