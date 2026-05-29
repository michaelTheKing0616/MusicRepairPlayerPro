#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIBS_DIR="$ROOT/android/libs"
AAR_NAME="ffmpeg-kit-full-gpl.aar"
AAR_PATH="$LIBS_DIR/$AAR_NAME"

# FFmpegKit was retired; Maven Central no longer hosts com.arthenica:ffmpeg-kit-* artifacts.
# This mirror is used only to restore Android CI/local builds for ffmpeg-kit-react-native.
AAR_URL="https://github.com/NooruddinLakhani/ffmpeg-kit-full-gpl/releases/download/v1.0.0/ffmpeg-kit-full-gpl.aar"

mkdir -p "$LIBS_DIR"

if [[ -f "$AAR_PATH" && -s "$AAR_PATH" ]]; then
  echo "FFmpegKit AAR already present: $AAR_PATH"
  exit 0
fi

echo "Downloading FFmpegKit AAR to $AAR_PATH"
curl -fsSL "$AAR_URL" -o "$AAR_PATH"
echo "FFmpegKit AAR ready ($(du -h "$AAR_PATH" | cut -f1))."
