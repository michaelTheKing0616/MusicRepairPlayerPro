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
  if (!content.includes(marker)) {
    return false;
  }
  // Broken partial patch from an earlier script version.
  return (
    content.includes('classpath("com.facebook.react:react-native-gradle-plugin")') ||
    content.includes("classpath('com.facebook.react:react-native-gradle-plugin')") ||
    /apply plugin:\s*['"]com\.facebook\.react['"]/.test(content)
  );
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
  let inBuildscript = false;
  let buildscriptDepth = 0;
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('buildscript')) {
      inBuildscript = true;
      const braces = countBraces(line);
      buildscriptDepth = braces.open - braces.close;
      if (buildscriptDepth <= 0) {
        buildscriptDepth = 1;
      }
      changed = true;
      continue;
    }

    if (inBuildscript) {
      const braces = countBraces(line);
      buildscriptDepth += braces.open - braces.close;
      if (buildscriptDepth <= 0) {
        inBuildscript = false;
      }
      changed = true;
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
  if (normalized.endsWith('@react-native-community/slider/android/build.gradle')) {
    fs.writeFileSync(buildGradlePath, `${SLIDER_BUILD_GRADLE}\n`);
    console.log(`${marker} Patched ${path.relative(nodeModulesDir, buildGradlePath)} (full replace)`);
    return true;
  }

  if (patchBuildGradleGeneric(buildGradlePath)) {
    console.log(`${marker} Patched ${path.relative(nodeModulesDir, buildGradlePath)}`);
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
