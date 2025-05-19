AGENT Manifest – MedRec 2.0

Purpose: Tell GitHub‑based AI/Code agents (Copilot Chat, Codex workflows, etc.) how to help on this project.Audience: Future contributors & automation tools.

1 · Project Mission

MedRec 2.0 lets nurses compare a patient’s pre‑admission meds to hospital‑discharge meds. The SPA (single‑page app) pulls OCR text, parses each order, detects discrepancies (dose, freq, formulation, etc.), highlights critical drugs, and exports a PDF for the chart.

2 · Codebase Overview

Path

Role

index.html

Main SPA. Contains markup, styles & a large JS block.

functions/

Firebase Cloud Functions. Wrapper around Google Vision OCR – returns { text, confidence }.

public/

Static hosting root. Assets (logo, CSS), compiled bundles if we ever split JS.

docs/AGENT.md

← you are here

Runtime stack

Frontend: Vanilla JS (ES6), HTML, CSS.

Libraries: html2canvas, jspdf, jspdf-autotable, Firebase v10 compat.

Hosting / OCR: Firebase Hosting + Cloud Functions.

3 · Build / Run / Deploy

# 0. Prereqs – Node ≥18, Firebase CLI, Git.

# 1. Clone & install tools
npm i -g firebase-tools  # if missing

# 2. Serve the SPA locally
# (Hot‑reload if you have the “Live Server” VS Code extension.)
open index.html          # or live‑server .

# 3. Emulate Firebase functions (OCR)
firebase emulators:start --only functions,hosting

# 4. Deploy (prod)
firebase deploy          # hosts + functions

4 · Environment

REACT_APP_FIREBASE_API_KEY     (likewise for other Firebase fields)
# For local dev you can keep them hard‑coded in index.html – but prefer .env for builds.

5 · Coding‑style Conventions

ES6+ – const/let, arrow fns, template literals.

Single responsibility helpers in /src (TBD) – split giant index.html script gradually.

snake_case keys coming from OCR JSON; camelCase variables/functions.

Normalize before compare – all drug strings pass through normalizeMedicationName() once.

No framework: keep zero‑dependency DOM code unless we migrate to React later.

6 · Testing Strategy

Unit tests (Jest) live in tests/. Run `npm test` to execute them.

Smoke test: npm run lint && open index.html, paste fixture med lists, expect zero console errors.

7 · Open Tasks – AI, please suggest PRs for these

* Refactor `parseOrder` into helpers – **Postponed**

8 · How AI Agents Should Help

Trigger

Desired Action

Edit JS

Auto‑run ESLint + Prettier, propose refactors into smaller fns.

New function

Suggest Jest test stub with sample med strings.

Push / PR

Comment if parseOrder() complexity > 15, or if duplicated regexes can be combined.

Docs

Keep drug lists in sync – flag if criticalMeds diverges between code & /data/critical‑meds.json (future).

9 · License & IP

© 2025 David Gottschalk. Internal prototype – not for production without legal review.

When updating this file: keep sections stable so agents don’t lose anchors.  Feel free to add new tables/links.

