/**
 * Patches ffmpeg-kit-react-native to use a local AAR because Arthenica retired
 * FFmpegKit and removed Maven artifacts (com.arthenica:ffmpeg-kit-https:6.0-2).
 */
const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'ffmpeg-kit-react-native',
  'android',
  'build.gradle',
);

if (!fs.existsSync(buildGradlePath)) {
  console.warn('[patch-ffmpeg-kit] ffmpeg-kit-react-native not installed; skipping.');
  process.exit(0);
}

const marker = "implementation(name: 'ffmpeg-kit-full-gpl', ext: 'aar')";
const remoteLine =
  "  implementation 'com.arthenica:ffmpeg-kit-' + safePackageName(safeExtGet('ffmpegKitPackage', 'https')) + ':' + safePackageVersion(safeExtGet('ffmpegKitPackage', 'https'))";
const patchedBlock =
  "  implementation(name: 'ffmpeg-kit-full-gpl', ext: 'aar')\n  implementation 'com.arthenica:smart-exception-java:0.2.1'";

let content = fs.readFileSync(buildGradlePath, 'utf8');

if (content.includes(marker)) {
  console.log('[patch-ffmpeg-kit] Already patched.');
  process.exit(0);
}

if (!content.includes(remoteLine)) {
  console.error('[patch-ffmpeg-kit] Could not find remote FFmpegKit dependency line.');
  process.exit(1);
}

content = content.replace(remoteLine, patchedBlock);
fs.writeFileSync(buildGradlePath, content);
console.log('[patch-ffmpeg-kit] Patched android/build.gradle to use local AAR.');
