import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

const tauriConfPath = 'src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
console.log(`Synced tauri.conf.json version to ${version}`);

const cargoPath = 'src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
cargo = cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo, 'utf8');
console.log(`Synced Cargo.toml version to ${version}`);

const lockPath = 'src-tauri/Cargo.lock';
if (fs.existsSync(lockPath)) {
  let lock = fs.readFileSync(lockPath, 'utf8');
  lock = lock.replace(/(name = "feathermd"\s*\n\s*version = ")[^"]*"/g, `$1${version}"`);
  fs.writeFileSync(lockPath, lock, 'utf8');
  console.log(`Synced Cargo.lock version to ${version}`);
}

const indexHtmlPath = 'index.html';
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  html = html.replace(/(<span class="version-text">)v[^<]*(<\/span>)/g, `$1v${version}$2`);
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  console.log(`Synced index.html brand-version to ${version}`);
}

const pageCssPath = 'page/styles.css';
if (fs.existsSync(pageCssPath)) {
  let css = fs.readFileSync(pageCssPath, 'utf8');
  css = css.replace(/content:\s*"v[^"]*";\s*\/\*\s*page-version\s*\*\//g, `content: "v${version}"; /* page-version */`);
  fs.writeFileSync(pageCssPath, css, 'utf8');
  console.log(`Synced page/styles.css page-version to ${version}`);
}

const pageHtmlPath = 'page/index.html';
if (fs.existsSync(pageHtmlPath)) {
  let html = fs.readFileSync(pageHtmlPath, 'utf8');
  html = html.replace(/Feather MD v[^<]*(\s*<\/h4>)/g, `Feather MD v${version}$1`);
  html = html.replace(/(class="download-version" id="dl-(win|deb|app)-ver">)v[^<]*(<\/div>)/g, `$1v${version}$3`);
  fs.writeFileSync(pageHtmlPath, html, 'utf8');
  console.log(`Synced page/index.html version to ${version}`);
}

