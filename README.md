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

First install dependencies:

```bash
npm install
```

Then execute tests with:

```bash
npm test
```

The test harness expects the `firebase` package to be available. Install it with
`npm i firebase` or rely on the dev dependency declared in `package.json`.
