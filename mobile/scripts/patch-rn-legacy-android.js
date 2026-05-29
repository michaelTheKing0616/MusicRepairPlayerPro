/**
 * RN 0.76 resolves the React Gradle plugin via includeBuild in settings.gradle.
 * Some community libraries still declare:
 *   classpath("com.facebook.react:react-native-gradle-plugin")  // empty Maven version
 *   apply plugin: "com.facebook.react"
 * which breaks CI. Strip those from library android/build.gradle files.
 */
const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
const marker = '[patch-rn-legacy-android]';

function findAndroidBuildGradleFiles() {
  const results = [];
  for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModulesDir, entry.name);
      for (const pkg of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (!pkg.isDirectory()) {
          continue;
        }
        const buildGradlePath = path.join(scopeDir, pkg.name, 'android', 'build.gradle');
        if (fs.existsSync(buildGradlePath)) {
          results.push(buildGradlePath);
        }
      }
      continue;
    }
    const buildGradlePath = path.join(nodeModulesDir, entry.name, 'android', 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
      results.push(buildGradlePath);
    }
  }
  return results;
}

function patchBuildGradle(buildGradlePath) {
  let lines = fs.readFileSync(buildGradlePath, 'utf8').split(/\r?\n/);
  if (!lines.some((line) => line.includes('react-native-gradle-plugin'))) {
    return false;
  }
  if (lines[0].includes(marker)) {
    return false;
  }

  const out = [];
  let inBuildscript = false;
  let buildscriptDepth = 0;
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('buildscript')) {
      inBuildscript = true;
      buildscriptDepth = 0;
      changed = true;
      continue;
    }

    if (inBuildscript) {
      if (trimmed.includes('{')) {
        buildscriptDepth += (line.match(/{/g) || []).length;
      }
      if (trimmed.includes('}')) {
        buildscriptDepth -= (line.match(/}/g) || []).length;
      }
      if (buildscriptDepth <= 0 && trimmed === '}') {
        inBuildscript = false;
      }
      continue;
    }

    if (/apply plugin:\s*['"]com\.facebook\.react['"]/.test(trimmed)) {
      changed = true;
      continue;
    }

    if (/api\s+['"]com\.facebook\.react:react-native:\+['"]/.test(trimmed)) {
      out.push('  implementation("com.facebook.react:react-android")');
      changed = true;
      continue;
    }

    out.push(line);
  }

  if (!changed) {
    return false;
  }

  while (out.length > 0 && out[0].trim() === '') {
    out.shift();
  }
  while (out.length > 0 && out[0].trim() === '}') {
    out.shift();
  }

  const content = `// ${marker}\n${out.join('\n')}\n`;
  fs.writeFileSync(buildGradlePath, content);
  console.log(`${marker} Patched ${path.relative(nodeModulesDir, buildGradlePath)}`);
  return true;
}

if (!fs.existsSync(nodeModulesDir)) {
  console.warn(`${marker} node_modules missing; skipping.`);
  process.exit(0);
}

const buildFiles = findAndroidBuildGradleFiles();
let patchedCount = 0;

for (const buildGradlePath of buildFiles) {
  if (patchBuildGradle(buildGradlePath)) {
    patchedCount += 1;
  }
}

console.log(`${marker} Done (${patchedCount} file(s) patched).`);
