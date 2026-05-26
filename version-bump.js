import fs from 'fs';

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

// 1. Update tauri.conf.json
const tauriConfPath = 'src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
console.log(`Synced tauri.conf.json version to ${version}`);

// 2. Update Cargo.toml
const cargoPath = 'src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
cargo = cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo, 'utf8');
console.log(`Synced Cargo.toml version to ${version}`);
