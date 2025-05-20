# MedRec-2.0
Medication reconciliation app.

## Requirements
- **Node.js 18** or later

## Local Development

1. Open `index.html` in your browser to run the app.
   - For automatic reload, you can run `npx live-server` from the project root.

## Configuration

The app reads runtime settings from `config.json`. Create this file by copying
`config.example.json` and filling in your Firebase credentials and support
contact email.

## Running Tests

Tests live in the `tests` folder.

First install dependencies if you plan to modify Firebase functionality:

```bash
npm install
```

`tests/runTests.js` provides a stubbed `firebase` object, so the suite runs even
when the package is not installed.

Then execute tests with:

```bash
npm test
```

## Linting

Run ESLint over the JavaScript and HTML files with:

```bash
npm run lint
```
