#!/usr/bin/env node
/**
 * build-sidecar.js
 * ─────────────────
 * Compiles the Graphyne server into a standalone binary for the current
 * platform using @yao-pkg/pkg, then copies it into the Tauri binaries
 * directory with the correct triple-suffixed filename that tauri-action
 * expects (e.g. graphyne-server-aarch64-apple-darwin).
 *
 * Usage:
 *   node scripts/build-sidecar.js          ← auto-detects current platform
 *   node scripts/build-sidecar.js --all    ← build for all supported targets
 *
 * Run via: npm run build:binary
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Platform → (pkg target, Rust triple) map ──────────────────────────────────
const TARGETS = [
  { pkg: 'node20-linux-x64',   triple: 'x86_64-unknown-linux-gnu',   ext: '' },
  { pkg: 'node20-linux-arm64', triple: 'aarch64-unknown-linux-gnu',  ext: '' },
  { pkg: 'node20-macos-x64',   triple: 'x86_64-apple-darwin',        ext: '' },
  { pkg: 'node20-macos-arm64', triple: 'aarch64-apple-darwin',       ext: '' },
  { pkg: 'node20-win-x64',     triple: 'x86_64-pc-windows-msvc',     ext: '.exe' },
];

// ── Detect the current platform ───────────────────────────────────────────────
function getCurrentTarget() {
  const plat = process.platform; // 'linux' | 'darwin' | 'win32'
  const arch = process.arch;     // 'x64' | 'arm64'

  if (plat === 'linux'  && arch === 'x64')   return TARGETS[0];
  if (plat === 'linux'  && arch === 'arm64') return TARGETS[1];
  if (plat === 'darwin' && arch === 'x64')   return TARGETS[2];
  if (plat === 'darwin' && arch === 'arm64') return TARGETS[3];
  if (plat === 'win32'  && arch === 'x64')   return TARGETS[4];

  console.error(`❌ Unsupported platform: ${plat}/${arch}`);
  process.exit(1);
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');           // graphyne-server/
const LAUNCHER    = path.resolve(ROOT, '../graphyne-launcher');
const BINARIES    = path.join(LAUNCHER, 'src-tauri', 'binaries');
const ENTRY       = path.join(ROOT, 'dist', 'server.js');
const BINARIES_TMP = path.join(ROOT, 'binaries');

// ── Build one target ──────────────────────────────────────────────────────────
function buildTarget(target) {
  console.log(`\n📦 Building for ${target.triple} (pkg target: ${target.pkg})...`);

  // Ensure dist/ is fresh
  console.log('  → Bundling migration SQL...');
  execSync('node scripts/bundle-migrations.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('  → Generating Prisma client...');
  execSync('npx prisma generate', { cwd: ROOT, stdio: 'inherit' });

  // pkg compile
  fs.mkdirSync(BINARIES_TMP, { recursive: true });
  const outPath = path.join(BINARIES_TMP, `graphyne-server${target.ext}`);

  console.log(`  → Running pkg...`);
  execSync(
    `npx pkg ${ENTRY} --target ${target.pkg} --output ${outPath} --compress GZip`,
    { cwd: ROOT, stdio: 'inherit' },
  );

  // Copy to Tauri binaries directory with triple-suffixed name
  fs.mkdirSync(BINARIES, { recursive: true });
  const destName = `graphyne-server-${target.triple}${target.ext}`;
  const destPath = path.join(BINARIES, destName);

  fs.copyFileSync(outPath, destPath);

  // Ensure executable bit on Unix
  if (target.ext !== '.exe') {
    fs.chmodSync(destPath, 0o755);
  }

  console.log(`  ✅ Written → ${destPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const buildAll = process.argv.includes('--all');

if (buildAll) {
  for (const target of TARGETS) {
    buildTarget(target);
  }
} else {
  buildTarget(getCurrentTarget());
}

console.log('\n🎉 Sidecar build complete.');