# Contributing to Feather MD

Thanks for the interest. Bug fixes, feature work, documentation, theme additions, and accessibility improvements are all welcome.

## Reporting bugs and requesting features

1. Search [existing issues](https://github.com/prathamreet/featherMD/issues) first to avoid duplicates.
2. Open a new issue using the relevant template.
3. Include a clear description, reproduction steps, your OS and app version, and a screenshot or short clip if it helps.

## Local development

```bash
git clone https://github.com/prathamreet/featherMD.git
cd featherMD
npm install
npm run tauri dev
```

Run the test and lint suites before pushing:

```bash
npm run lint
npm test
```

A full audit (build, tests, benchmarks, bundle sizes) is available via:

```bash
npm run report
```

## Pull requests

1. Fork the repo and branch from `main`.
2. Keep each branch and PR focused on one logical change. Unrelated fixes go into separate PRs.
3. Use Conventional Commits for the commit message: `type(scope): description`. Examples:
   * `feat(editor): add autosave on focus loss`
   * `fix(preview): escape attribute values inside code blocks`
   * `refactor(ui): collapse status-bar updates into a single render pass`
4. Make sure `npm run lint` and `npm test` pass.
5. Open the PR against `main`. Link the issue it closes.

## Coding standards

* ESLint is the source of truth for JS style. Run `npm run lint` before committing.
* Add or update tests for new behavior. Tests live under `tests/` and mirror `src/`.
* Keep functions small and module boundaries clean. New top-level modules go under `src/core/`, `src/ui/`, `src/editor/`, `src/preview/`, or `src/platform/` depending on responsibility.
* Tauri-specific code stays inside `src/platform/` or `src-tauri/`. Avoid leaking Tauri imports into the editor, preview, or UI modules.
* No new runtime dependencies without a clear justification. Bundle size is a feature.

Thanks for helping make Feather MD better.
