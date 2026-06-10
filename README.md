# Pure Expense

Private receipt-scanning expense tracker. Scan a receipt on your iPhone, the app
reads it on-device, an LLM structures the details, the photo is archived to R2,
and a categorized expense is saved — with edit-before-save, search/filter, and
monthly summaries.

## Architecture

Monorepo with two workspaces:

- **`worker/`** — Cloudflare Worker API ([Hono](https://hono.dev)) backed by
  **D1** (expenses, via [Drizzle ORM](https://orm.drizzle.team)), **R2** (receipt
  photos), and **Workers AI** (text → structured JSON). Single-user auth via a
  shared bearer token.
- **`mobile/`** — [Expo](https://expo.dev) (SDK 56) iOS app. On-device OCR with
  ML Kit text recognition, camera capture, and TanStack Query for data.

```
phone camera → on-device OCR (raw text) → POST /api/parse (Workers AI)
            → review/edit → POST /api/receipts (R2) + POST /api/expenses (D1)
```

## Quick start

```bash
npm install                 # install all workspaces

# Backend
npm run db:generate         # generate Drizzle migration SQL
npm run worker:migrate      # apply migrations to local D1
npm run worker:dev          # wrangler dev on http://localhost:8787

# App (needs an EAS dev build — camera + ML Kit are native modules)
npm run mobile:start        # expo start --dev-client
```

See `CLAUDE.md` for architecture notes.
