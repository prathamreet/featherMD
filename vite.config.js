import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the SAME build works both in the Tauri webview
  // (served at the root) and when embedded on GitHub Pages at a subpath
  // (/featherMD/demo/ — the landing page's live-demo iframe). Absolute '/'
  // paths would 404 under the subpath.
  base: './',
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/target/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
