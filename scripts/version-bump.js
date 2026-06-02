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

const cssPath = 'src/styles/base.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(/content:\s*"v[^"]*";\s*\/\*\s*brand-version\s*\*\//g, `content: "v${version}"; /* brand-version */`);
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log(`Synced base.css brand-version to ${version}`);
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
  html = html.replace(/Feather MD v[0-9.]+(\s*<\/h4>)/g, `Feather MD v${version}$1`);
  html = html.replace(/(class="download-version" id="dl-(win|deb|app)-ver">)v[0-9.]+(<\/div>)/g, `$1v${version}$3`);
  fs.writeFileSync(pageHtmlPath, html, 'utf8');
  console.log(`Synced page/index.html version to ${version}`);
}

