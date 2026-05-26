import fs from 'fs';

/**
 * Syncs the application version across the entire workspace.
 * This script runs automatically during the 'npm version' lifecycle hook.
 * It ensures the Node.js version is propagated to both the Tauri config
 * and Rust package manifests, maintaining version consistency.
 */

// 1. Read the newly bumped version from package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

// 2. Sync version to the Tauri configuration file (tauri.conf.json)
const tauriConfPath = 'src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version; // Set new version
// Write back the updated Tauri config with pretty formatting and a trailing newline
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
console.log(`Synced tauri.conf.json version to ${version}`);

// 3. Sync version to the Rust package manifest (Cargo.toml)
const cargoPath = 'src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
// Use regex to locate and replace the first occurrence of package version in Cargo.toml
cargo = cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo, 'utf8');
console.log(`Synced Cargo.toml version to ${version}`);

// 4. Sync version inside Rust lockfile (Cargo.lock) if it exists
const lockPath = 'src-tauri/Cargo.lock';
if (fs.existsSync(lockPath)) {
  let lock = fs.readFileSync(lockPath, 'utf8');
  // Use regex to target only the version line nested directly under the "feathermd" package block
  lock = lock.replace(/(name = "feathermd"\s*\n\s*version = ")[^"]*"/g, `$1${version}"`);
  fs.writeFileSync(lockPath, lock, 'utf8');
  console.log(`Synced Cargo.lock version to ${version}`);
}
