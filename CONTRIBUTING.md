# Contributing to Feather MD

Thank you for your interest in contributing to Feather MD! We welcome and appreciate contributions of all kinds, including bug fixes, feature suggestions, documentation updates, and UI styling improvements.

Please take a moment to review this document to ensure a smooth contribution process.

## How to Contribute

### 1. Reporting Bugs & Feature Requests
* Search the existing issues to ensure it hasn't already been reported or requested.
* If it is a new bug or feature, please open an issue using the appropriate template.
* Provide a clear description, reproduction steps, and screenshots if applicable.

### 2. Development Setup
To set up the project locally:
1. Clone the repository: `git clone https://github.com/prathamreet/featherMD.git`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Start unit tests: `npm run test`

### 3. Creating a Pull Request
1. Fork the repository and create your branch from `main`.
2. Keep your changes focused. If you are fixing multiple unrelated bugs, please open separate branches/PRs.
3. Make sure tests pass and linting succeeds:
   ```bash
   npm run lint
   npm run test
   ```
4. Commit your changes using descriptive, conventional commit messages:
   * Format: `type(scope): description` (e.g., `feat(editor): add autosave feature`)
5. Open your pull request against the `main` branch of `featherMD`.

## Coding Standards
* We use **ESLint** for frontend formatting and coding standards. Please run the linter to ensure your code matches the existing style guide.
* Write unit tests for new features where possible.
* Keep style adjustments modern, clean, and responsive.

Thank you again for contributing to make Feather MD better!
