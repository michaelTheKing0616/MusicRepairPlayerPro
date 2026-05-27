#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DTLN_DIR="$ROOT/android/app/src/main/assets/dtln"
DPDF_DIR="$ROOT/android/app/src/main/assets/dpdfnet"

mkdir -p "$DTLN_DIR" "$DPDF_DIR"

download_if_missing() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" && -s "$dest" ]]; then
    echo "Already present: $dest"
    return 0
  fi
  echo "Downloading: $dest"
  curl -fsSL "$url" -o "$dest"
}

download_if_missing \
  "https://raw.githubusercontent.com/breizhn/DTLN/master/pretrained_model/model_1.tflite" \
  "$DTLN_DIR/model_1.tflite"

download_if_missing \
  "https://raw.githubusercontent.com/breizhn/DTLN/master/pretrained_model/model_2.tflite" \
  "$DTLN_DIR/model_2.tflite"

download_if_missing \
  "https://huggingface.co/Ceva-IP/DPDFNet/resolve/main/dpdfnet8_48khz_hr.tflite?download=true" \
  "$DPDF_DIR/dpdfnet8_48khz_hr.tflite"

echo "On-device ML models ready."
