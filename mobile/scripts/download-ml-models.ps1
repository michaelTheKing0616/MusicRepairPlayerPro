$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$DtlnDir = Join-Path $Root "android\app\src\main\assets\dtln"
$DpdfDir = Join-Path $Root "android\app\src\main\assets\dpdfnet"

New-Item -ItemType Directory -Force -Path $DtlnDir, $DpdfDir | Out-Null

function Download-IfMissing {
  param(
    [string]$Url,
    [string]$Dest
  )
  if ((Test-Path $Dest) -and ((Get-Item $Dest).Length -gt 0)) {
    Write-Host "Already present: $Dest"
    return
  }
  Write-Host "Downloading: $Dest"
  Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
}

Download-IfMissing `
  -Url "https://raw.githubusercontent.com/breizhn/DTLN/master/pretrained_model/model_1.tflite" `
  -Dest (Join-Path $DtlnDir "model_1.tflite")

Download-IfMissing `
  -Url "https://raw.githubusercontent.com/breizhn/DTLN/master/pretrained_model/model_2.tflite" `
  -Dest (Join-Path $DtlnDir "model_2.tflite")

Download-IfMissing `
  -Url "https://huggingface.co/Ceva-IP/DPDFNet/resolve/main/dpdfnet8_48khz_hr.tflite?download=true" `
  -Dest (Join-Path $DpdfDir "dpdfnet8_48khz_hr.tflite")

Write-Host "On-device ML models ready."
