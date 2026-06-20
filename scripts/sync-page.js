// Copy the built app (dist/) into page/demo/ so the landing page's live-demo
// iframe (<iframe src="./demo/">) can be previewed locally exactly as the
// GitHub Pages deploy serves it.
//
// Run via `npm run sync-page` (which builds first), then `npx serve page`.
// page/demo/ is gitignored; CI (deploy-pages.yml) regenerates it into the
// published Pages artifact, so this is only for local preview.
//
// Cross-platform on purpose: uses Node's fs (cpSync, Node >= 16.7) instead of
// shell `cp -r` / `mkdir -p`, which do not exist in cmd.exe on Windows.
import fs from 'fs';

const SRC = 'dist';
const DEST = 'page/demo';

if (!fs.existsSync(SRC)) {
  console.error(`[sync-page] "${SRC}/" not found — run "npm run build" first.`);
  process.exit(1);
}

// Clear any stale copy (incl. a previously mis-nested dist/) before copying so
// page/demo/index.html lands directly, not page/demo/dist/index.html.
fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

console.log(`[sync-page] ${SRC}/ -> ${DEST}/  (preview with: npx serve page)`);
