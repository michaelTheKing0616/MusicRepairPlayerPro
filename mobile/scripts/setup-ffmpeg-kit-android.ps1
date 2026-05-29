$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$LibsDir = Join-Path $Root "android\libs"
$AarName = "ffmpeg-kit-full-gpl.aar"
$AarPath = Join-Path $LibsDir $AarName
$AarUrl = "https://github.com/NooruddinLakhani/ffmpeg-kit-full-gpl/releases/download/v1.0.0/ffmpeg-kit-full-gpl.aar"

New-Item -ItemType Directory -Force -Path $LibsDir | Out-Null

if ((Test-Path $AarPath) -and ((Get-Item $AarPath).Length -gt 0)) {
  Write-Host "FFmpegKit AAR already present: $AarPath"
  exit 0
}

Write-Host "Downloading FFmpegKit AAR to $AarPath"
Invoke-WebRequest -Uri $AarUrl -OutFile $AarPath -UseBasicParsing
Write-Host "FFmpegKit AAR ready."
