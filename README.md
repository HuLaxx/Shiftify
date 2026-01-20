<p align="center">
  <img src="docs/hero.png" alt="Shiftify hero" width="920">
</p>

<h1 align="center">Shiftify</h1>
<p align="center">Cookie-first YouTube Music transfer studio with deep diagnostics.</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?style=flat-square">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-0f4c81?style=flat-square">
  <img alt="UI" src="https://img.shields.io/badge/Interface-Shiftify_UI-f4b13f?style=flat-square">
  <img alt="Privacy" src="https://img.shields.io/badge/Cookies-Stay_Local-e4532c?style=flat-square">
</p>

<p align="center">
  <img src="docs/flow.gif" alt="Shiftify transfer flow preview" width="920">
</p>

<p align="center">
  Add the assets listed below under <code>docs/</code> to replace these placeholders.
</p>

## Contents

- [Why Shiftify](#why-shiftify)
- [Features](#features)
- [Screenshots and GIFs](#screenshots-and-gifs)
- [Design palette](#design-palette)
- [Project map](#project-map)
- [Local development](#local-development)
- [Security](#security)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Deployment](#deployment)

## Why Shiftify

Shiftify is designed to be a multi-role portfolio project. It ships a full
cookie-based YouTube Music transfer flow and exposes every step with logs,
diagnostics, and recovery lists.

## Features

- Cookie-first transfer for playlists and Liked Music
- No OAuth, no API keys, no background services
- Live logs, retries, and recovery lists
- Import studio for CSV, JSON, and line-based tracklists
- Review queue with approval and rejection controls
- Run history with telemetry and event logs
- Clear destination likes (optional, manual confirmation)
- Reports for missing video IDs and failed transfers

## Screenshots and GIFs

Add the following assets under `docs/`. The README references them by path.

### Hero and flow

- `docs/hero.png` (1200 x 720)
  - Landing page hero, desktop width, browser chrome hidden
- `docs/flow.gif` (1200 x 720, 8 to 12 seconds)
  - Quick run-through: landing -> transfer step -> report preview

### UI detail shots

| File | Capture | Notes |
| --- | --- | --- |
| `docs/step-1.png` | Step 1 cookie entry | Show the guidance card and AuthUser field |
| `docs/step-2.png` | Step 2 playlist list | Highlight the selected playlist |
| `docs/diagnostics.png` | Diagnostics open | Show counts + stop reason |
| `docs/reports.png` | Reports panel open | Show missing IDs and failed list |
| `docs/transfer.png` | Transfer running | Progress counters + live log |
| `docs/mobile.png` | Mobile view | iPhone width, hero + transfer header |

### Gallery

<p align="center">
  <img src="docs/step-1.png" alt="Step 1 cookie entry" width="420">
  <img src="docs/step-2.png" alt="Step 2 playlists" width="420">
</p>
<p align="center">
  <img src="docs/diagnostics.png" alt="Diagnostics panel" width="420">
  <img src="docs/reports.png" alt="Reports panel" width="420">
</p>
<p align="center">
  <img src="docs/transfer.png" alt="Transfer running" width="420">
  <img src="docs/mobile.png" alt="Mobile layout" width="420">
</p>

### Animations to capture

- Cursor hover glow on cards and buttons
- Stepper transitions between steps
- Live log updates while transfer runs

## Design palette

Use these values for screenshots or marketing material.

- Ink: `#1b1612`
- Accent: `#e4532c`
- Accent 2: `#197a72`
- Accent 3: `#f2c24b`
- Paper: `#f8f3ea`
- Surface: `#fff7ee`

## Project map

- UI: `src/app/page.tsx`
- Transfer flow: `src/app/transfer/page.tsx`
- Import studio: `src/app/import/page.tsx`
- Review queue: `src/app/review/page.tsx`
- Run history: `src/app/runs/page.tsx`
- API: `src/app/api/ytm/route.ts`
- Imports API: `src/app/api/imports`
- Runs API: `src/app/api/runs`
- Theme: `src/app/globals.css`

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Local metadata is stored in `data/shiftify.db` (ignored by git).

Optional demo flag:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

## Security

- Cookies are entered manually and never written to disk
- No OAuth or API keys required
- Run locally for maximum privacy

## Limitations

- YouTube Music only returns items that exist in YTM
- YouTube-only likes (private, deleted, blocked) will not appear
- Some tracks have no video ID and require manual lookup

## Roadmap

- Import pipelines (CSV, JSON, Google Takeout)
- Match scoring with confidence and manual review
- Resumable jobs with run history and analytics
- Demo mode with sample data for public deployments

## Deployment

Shiftify deploys cleanly on Vercel. For a public demo, add a demo dataset and
disable cookie submissions in production.
