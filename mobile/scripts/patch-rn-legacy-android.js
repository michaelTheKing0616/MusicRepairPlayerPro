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

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation "androidx.appcompat:appcompat:1.6.1"
    implementation("com.facebook.react:react-android")
}
`;

const TRACK_PLAYER_BUILD_GRADLE = `// ${marker}
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:\${rootProject.ext.kotlinVersion}"
    }
}

apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

def getExtOrIntegerDefault(name) {
    return rootProject.ext.has(name) ? rootProject.ext.get(name) : (project.properties['RNTP_' + name]).toInteger()
}

android {
    compileSdkVersion getExtOrIntegerDefault('compileSdkVersion')
    namespace 'com.doublesymmetry.trackplayer'

    defaultConfig {
        minSdkVersion getExtOrIntegerDefault('minSdkVersion')
        targetSdkVersion getExtOrIntegerDefault('targetSdkVersion')
        versionCode 300
        versionName '3.0'
        consumerProguardFiles 'proguard-rules.txt'
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }
}

repositories {
    mavenCentral()
    google()
}

dependencies {
    implementation 'com.github.doublesymmetry:kotlinaudio:v2.1.0'
    implementation("com.facebook.react:react-android")
    implementation "androidx.core:core-ktx:1.9.0"
    implementation "androidx.localbroadcastmanager:localbroadcastmanager:1.1.0"
    implementation "androidx.lifecycle:lifecycle-process:2.5.1"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.3"
}
`;

const FULL_REPLACEMENTS = new Map([
  ['@react-native-community/slider/android/build.gradle', SLIDER_BUILD_GRADLE],
  ['@react-native-voice/voice/android/build.gradle', VOICE_BUILD_GRADLE],
  ['react-native-track-player/android/build.gradle', TRACK_PLAYER_BUILD_GRADLE],
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

function patchBuildGradleGeneric(buildGradlePath) {
  let lines = fs.readFileSync(buildGradlePath, 'utf8').split(/\r?\n/);
  lines = lines.filter((line) => !line.includes(marker));

  const out = [];
  let changed = false;
  let inBuildscript = false;
  let buildscriptDepth = 0;
  let buildscriptLines = [];

  function flushBuildscript() {
    if (buildscriptLines.length === 0) {
      return;
    }
    const kept = buildscriptLines.filter(
      (scriptLine) =>
        !scriptLine.includes('react-native-gradle-plugin') &&
        !scriptLine.includes('com.facebook.react:react-native-gradle-plugin'),
    );
    if (kept.length !== buildscriptLines.length) {
      changed = true;
    }
    if (kept.length > 0) {
      out.push(...kept);
    }
    buildscriptLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('buildscript')) {
      flushBuildscript();
      inBuildscript = true;
      const braces = countBraces(line);
      buildscriptDepth = braces.open - braces.close;
      if (buildscriptDepth <= 0) {
        buildscriptDepth = 1;
      }
      buildscriptLines = [line];
      continue;
    }

    if (inBuildscript) {
      buildscriptLines.push(line);
      const braces = countBraces(line);
      buildscriptDepth += braces.open - braces.close;
      if (buildscriptDepth <= 0) {
        inBuildscript = false;
        flushBuildscript();
      }
      continue;
    }

    if (/apply plugin:\s*['"]com\.facebook\.react['"]/.test(trimmed)) {
      changed = true;
      continue;
    }

    if (trimmed.includes('jcenter()')) {
      changed = true;
      continue;
    }

    if (/com\.android\.support:appcompat/.test(trimmed)) {
      out.push('    implementation "androidx.appcompat:appcompat:1.6.1"');
      changed = true;
      continue;
    }

    if (/com\.facebook\.react:react-native:\+/.test(trimmed)) {
      const indent = line.match(/^\s*/)?.[0] ?? '  ';
      out.push(`${indent}implementation("com.facebook.react:react-android")`);
      changed = true;
      continue;
    }

    out.push(line);
  }

  flushBuildscript();

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

function normalizeGradle(content) {
  return content.replace(/\r\n/g, '\n').replace(/\/\/ \[patch-rn-legacy-android\]\n?/, '').trim();
}

function patchBuildGradle(buildGradlePath) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');
  const normalized = buildGradlePath.replace(/\\/g, '/');
  const suffix = normalized.slice(normalized.indexOf('node_modules/') + 'node_modules/'.length);

  if (FULL_REPLACEMENTS.has(suffix)) {
    const expected = normalizeGradle(`${FULL_REPLACEMENTS.get(suffix)}\n`);
    const current = normalizeGradle(content);
    if (current !== expected || needsPatch(content)) {
      fs.writeFileSync(buildGradlePath, `${FULL_REPLACEMENTS.get(suffix)}\n`);
      console.log(`${marker} Patched ${suffix} (full replace)`);
      return true;
    }
    return false;
  }

  if (!needsPatch(content)) {
    return false;
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
