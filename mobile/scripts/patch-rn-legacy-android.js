/**
 * RN 0.76 resolves the React Gradle plugin via includeBuild in settings.gradle.
 * Patches legacy library android/build.gradle files for CI compatibility.
 */
const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
const marker = '[patch-rn-legacy-android]';

const SLIDER_BUILD_GRADLE = `// ${marker}
apply plugin: 'com.android.library'

def getExtOrDefault(name) {
  return rootProject.ext.has(name) ? rootProject.ext.get(name) : project.properties['ReactNativeSlider_' + name]
}

def getExtOrIntegerDefault(name) {
  return rootProject.ext.has(name) ? rootProject.ext.get(name) : (project.properties['ReactNativeSlider_' + name]).toInteger()
}

android {

  def agpVersion = com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION.tokenize('.')
  def major = agpVersion[0].toInteger()
  def minor = agpVersion[1].toInteger()
  if ((major == 7 && minor >= 3) || major >= 8) {
    namespace "com.reactnativecommunity.slider"
    buildFeatures {
      buildConfig true
    }
  }

  compileSdkVersion getExtOrIntegerDefault('compileSdkVersion')
  buildToolsVersion getExtOrDefault('buildToolsVersion')

  defaultConfig {
    minSdkVersion getExtOrIntegerDefault('minSdkVersion')
    targetSdkVersion getExtOrIntegerDefault('targetSdkVersion')
  }

  sourceSets {
    main {
      java.srcDirs += ['src', "\${project.buildDir}/generated/source/codegen/java"]
    }
  }
}

repositories {
  google()
  mavenCentral()
}

dependencies {
  implementation("com.facebook.react:react-android")
}
`;

const VOICE_BUILD_GRADLE = `// ${marker}
apply plugin: 'com.android.library'

android {
    namespace "com.wenkesj.voice"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }
}

dependencies {
    implementation "androidx.appcompat:appcompat:1.6.1"
    implementation("com.facebook.react:react-android")
}
`;

const FULL_REPLACEMENTS = new Map([
  ['@react-native-community/slider/android/build.gradle', SLIDER_BUILD_GRADLE],
  ['@react-native-voice/voice/android/build.gradle', VOICE_BUILD_GRADLE],
]);

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

function needsPatch(content) {
  if (content.includes('react-native-gradle-plugin')) {
    return true;
  }
  if (/com\.facebook\.react:react-native:\+/.test(content)) {
    return true;
  }
  if (content.includes('jcenter()')) {
    return true;
  }
  if (content.includes('com.android.support:')) {
    return true;
  }
  if (content.includes(marker)) {
    return (
      content.includes('classpath("com.facebook.react:react-native-gradle-plugin")') ||
      content.includes("classpath('com.facebook.react:react-native-gradle-plugin')") ||
      /apply plugin:\s*['"]com\.facebook\.react['"]/.test(content) ||
      /com\.facebook\.react:react-native:\+/.test(content)
    );
  }
  return false;
}

function countBraces(line) {
  const open = (line.match(/{/g) || []).length;
  const close = (line.match(/}/g) || []).length;
  return { open, close };
}

function skipBalancedBlock(lines, startIndex, blockName) {
  let depth = 0;
  let i = startIndex;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (i === startIndex) {
      const braces = countBraces(line);
      depth = braces.open - braces.close;
      if (depth <= 0) {
        depth = 1;
      }
      continue;
    }
    const braces = countBraces(line);
    depth += braces.open - braces.close;
    if (depth <= 0) {
      return i + 1;
    }
  }
  return lines.length;
}

function patchBuildGradleGeneric(buildGradlePath) {
  let lines = fs.readFileSync(buildGradlePath, 'utf8').split(/\r?\n/);
  lines = lines.filter((line) => !line.includes(marker));

  const out = [];
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('buildscript') || trimmed.startsWith('allprojects')) {
      i = skipBalancedBlock(lines, i, trimmed.split(/\s+/)[0]);
      changed = true;
      continue;
    }

    if (/apply plugin:\s*['"]com\.facebook\.react['"]/.test(trimmed)) {
      i += 1;
      changed = true;
      continue;
    }

    if (trimmed.includes('jcenter()')) {
      i += 1;
      changed = true;
      continue;
    }

    if (/com\.android\.support:appcompat/.test(trimmed)) {
      out.push('    implementation "androidx.appcompat:appcompat:1.6.1"');
      i += 1;
      changed = true;
      continue;
    }

    if (/com\.facebook\.react:react-native:\+/.test(trimmed)) {
      const indent = line.match(/^\s*/)?.[0] ?? '  ';
      out.push(`${indent}implementation("com.facebook.react:react-android")`);
      i += 1;
      changed = true;
      continue;
    }

    out.push(line);
    i += 1;
  }

  if (!changed) {
    return false;
  }

  while (out.length > 0 && (out[0].trim() === '' || out[0].trim() === '}')) {
    out.shift();
  }

  const content = `// ${marker}\n${out.join('\n').trim()}\n`;
  fs.writeFileSync(buildGradlePath, content);
  return true;
}

function patchBuildGradle(buildGradlePath) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');
  if (!needsPatch(content)) {
    return false;
  }

  const normalized = buildGradlePath.replace(/\\/g, '/');
  const suffix = normalized.slice(normalized.indexOf('node_modules/') + 'node_modules/'.length);

  if (FULL_REPLACEMENTS.has(suffix)) {
    fs.writeFileSync(buildGradlePath, `${FULL_REPLACEMENTS.get(suffix)}\n`);
    console.log(`${marker} Patched ${suffix} (full replace)`);
    return true;
  }

  if (patchBuildGradleGeneric(buildGradlePath)) {
    console.log(`${marker} Patched ${suffix}`);
    return true;
  }

  return false;
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
