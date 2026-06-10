# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pure Expense is a private, single-user receipt-scanning expense tracker. An Expo
iOS app scans a receipt, reads it **on-device** (ML Kit OCR → raw text), sends
the text to a Cloudflare Worker that uses **Workers AI** to structure it, archives
the photo to **R2**, and stores a categorized expense in **D1**. Features: scan →
parse → edit-before-save → categorize, plus search/filter and monthly summaries.

npm workspaces monorepo: `worker/` (backend) and `mobile/` (Expo app). Root
`.npmrc` sets `legacy-peer-deps=true` (required so the Expo/React-Native peer
graph resolves).

## Commands

Run from the repo root unless noted.

```bash
# Backend (worker/)
npm run db:generate                       # regenerate migrations from src/db/schema.ts (run after schema edits)
npm run worker:migrate                    # apply migrations to LOCAL D1
npm --workspace worker run seed:local     # seed default categories (local)
npm run worker:dev                        # wrangler dev on :8787 (see AI caveat below)
npm --workspace worker run typecheck      # tsc --noEmit
npm run worker:deploy                     # wrangler deploy (production)
npm --workspace worker run migrate:remote # apply migrations to remote D1
npm --workspace worker run seed:remote    # seed categories on remote D1

# App (mobile/) — requires an EAS dev build, NOT Expo Go (native modules)
npm run mobile:start                      # expo start --dev-client
npm --workspace mobile run prebuild       # generate native ios/ project
npm --workspace mobile run typecheck
cd mobile && eas build --profile development   # build the dev client (needs an Expo account)
```

There is no test suite yet; verification is done by curling the Worker (see the
plan file / README) and running the app on a device.

## Architecture

**Request flow:** `phone camera → on-device OCR (mobile/src/ocr/recognize.ts) →
POST /api/parse (Workers AI) → review/edit screen → POST /api/receipts (R2) +
POST /api/expenses (D1)`.

**Worker (`worker/src/`)** — Hono app:
- `index.ts` mounts routes. `requireAuth` (lib/auth.ts) guards everything under
  `/api/*` with a constant-time `Bearer` token check; a second middleware injects
  a Drizzle client via `c.set("db", …)` and routes read it with `c.get("db")`.
- `routes/`: `expenses.ts` (CRUD + filtered list + `/:id` detail with line items),
  `receipts.ts` (R2 upload + auth'd streaming GET — the bucket is **private**),
  `parse.ts` (OCR text → structured JSON), `summary.ts` (monthly aggregates),
  `trends.ts` (per-month totals for the dashboard chart), `categories.ts`.
- Categories are a fixed set of **6 monochrome categories** (Food & Dining,
  Groceries, Transport, Shopping, Travel, Utilities) defined in `lib/validation.ts`
  (`DEFAULT_CATEGORIES`) and seeded by `seed.sql`. Each row's `id` is the icon glyph
  key the app renders; `color` is the design's mono ramp. Expenses store the
  category **name**. Currency defaults to CAD.
- `db/schema.ts` is the **single source of truth** for the DB. Drizzle-kit
  generates `migrations/*.sql`; never hand-edit migrations — change the schema and
  regenerate. Categories are seeded separately via `worker/seed.sql` (not a
  migration).
- `lib/parse-llm.ts` is the **only** place that talks to the model. To switch from
  Workers AI to OpenAI, change just this file (and add an `OPENAI_API_KEY` secret).
  It constrains output with a `json_schema` response format and validates with zod
  before trusting it.
- `lib/validation.ts` holds zod schemas + the canonical category list shared by the
  parser and the API.

**Mobile (`mobile/`)** — Expo Router (file-based routes in `app/`), TanStack Query:
- Navigation: `app/(tabs)/` is a custom bottom bar (Home · center **Scan** action ·
  History) — `(tabs)/index.tsx` is the dashboard, `(tabs)/history.tsx` the list.
  Modal/stack routes: `scan.tsx` (camera + OCR + parse), `review.tsx` (verify/edit →
  upload + create), `expense/[id].tsx` (detail + delete), `settings.tsx`,
  `onboarding.tsx` (shown when no API URL/token is set).
- **Design system** lives in `src/theme.ts` (mono light palette + the `categoryMeta`
  name→color/glyph map) and `src/ui/` — `Text`/`Eyebrow` (Schibsted Grotesk; custom
  fonts need an explicit family per weight), `Icon` (SVG set, requires
  `react-native-svg`), `CatIcon`, `TxnRow`, and `components.tsx` (`Card`,
  `PrimaryButton`, `IconButton`). Fonts load in `app/_layout.tsx` via
  `@expo-google-fonts/schibsted-grotesk`; splash holds until loaded.
- `src/api/client.ts` is the single fetch wrapper; it reads the base URL + token
  from `src/lib/settings.ts` and attaches the bearer header. Settings use **hybrid
  storage**: the `AUTH_TOKEN` (a credential) lives in the encrypted Keychain via
  expo-secure-store; the non-sensitive API URL + monthly budget live in
  AsyncStorage. `clearSettings()` wipes both (the Keychain token would otherwise
  survive an iOS reinstall); Settings exposes it as "Reset connection".
- `src/lib/queries.ts` holds all TanStack Query hooks + cache keys.
- The scan→review hand-off uses an in-memory module store (`src/lib/draft.ts`),
  not route params, to pass the image URI + parsed fields.

## Conventions & gotchas

- **Money is integer minor units (cents) everywhere** — DB, API, and app state.
  Format/parse only at the UI edge (`mobile/src/lib/format.ts`). The LLM returns
  major units; `parse-llm.ts` converts to cents.
- **Dates**: `purchasedAt` is `YYYY-MM-DD`; `summary` months are `YYYY-MM`.
- **Auth is a single shared token** (`AUTH_TOKEN`). Local dev: put it in
  `worker/.dev.vars` (copy from `.dev.vars.example`). Production: `wrangler secret
  put AUTH_TOKEN`. The app stores the same token in the device keychain via the
  Settings screen.
- **Workers AI in local dev hits the real account** (and bills). This Mac has two
  Cloudflare accounts, so `wrangler dev` can't auto-pick one — `account_id` is
  pinned in `wrangler.jsonc`, but the local AI fetcher reads the env var, so run
  with `CLOUDFLARE_ACCOUNT_ID=af0ec8a493c6e399108713177a57d0e5` if `/api/parse`
  returns a "More than one account" error.
- **First-time remote setup** before `worker:deploy`: create the R2 bucket
  (`wrangler r2 bucket create pure-expense-receipts`), ensure the D1 database id in
  `wrangler.jsonc` exists, then `migrate:remote` + `seed:remote` + `secret put`.
- **The app cannot run in Expo Go** — expo-camera, ML Kit OCR, and secure-store are
  native modules requiring a dev/EAS build.
- **Expo SDK is 56**; native package versions are pinned to the SDK's bundled set.
  After changing native deps run `npx expo install --fix` / `npm --workspace mobile
  run doctor`.
