# Pure Expense

This file is the working contract for agents making changes in this repository.

## Product Summary

Pure Expense is a private, single-user, review-first personal expense tracker.

The product is built for:

- importing historical spreadsheet-style monthly CSVs
- importing future monthly statement CSV and PDF exports
- categorizing transactions with AI
- letting the user review, edit, exclude, and approve rows before commit
- storing both historical monthly summaries and line-level entries
- running privately behind Cloudflare Access

## Tech Stack

- Frontend: `Vite` + `React`
- Routing: `react-router-dom`
- Backend: `Cloudflare Workers`
- Database: `Cloudflare D1`
- UI base: `@knadh/oat`
- AI categorization: OpenAI API
- Tests: `Vitest`

## Current Product Rules

- This is a dashboard-first app, not an upload-first app.
- Statement imports must stay staged until the user approves them.
- AI suggestions are advisory only.
- Historical spreadsheet imports must preserve the original monthly totals.
- Historical spreadsheet imports should also store line-level imported entries when available.
- Merchant/category corrections should be reusable for future imports.
- Production is private and protected by Cloudflare Access.

## Data Model Expectations

Keep the following concepts intact:

- `categories`
- `monthly_snapshots`
- `historical_entries`
- `imports`
- `import_rows`
- `transactions`
- `merchant_rules`
- `ai_suggestions`

Do not simplify the model back to category totals only.
Historical imports must support both:

- month/category summary totals
- per-entry imported values

## Import Workflow Expectations

There are two import paths:

1. `historical-summary`
- source is a spreadsheet-style monthly CSV
- preserve monthly category totals
- preserve imported line items when present
- do not invent fake statement transactions

2. `statement`
- source is monthly card/bank CSV or PDF
- parse into normalized staged rows
- run AI categorization
- show rows for human review
- allow category correction and exclusion
- commit only approved rows

## API Expectations

These interfaces are part of the app contract:

- `POST /api/imports`
- `GET /api/imports`
- `GET /api/imports/:id`
- `POST /api/imports/:id/categorize`
- `POST /api/imports/:id/commit`
- `GET /api/dashboard`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories`
- `GET /api/transactions`

## UI Direction

This repo should follow a flat editorial SaaS style inspired by:

- [ScrapingBee](https://www.scrapingbee.com/)

This is the active design direction. Follow it unless the user explicitly changes it.

UI components to use : https://oat.ink/components/

### Design Principles

- flat layout, not layered “card inside card” UI
- square corners everywhere by default
- strong contrast and legible small text
- calm paper-like background
- dark ink sidebar/navigation
- warm copper accent color
- sparse but deliberate borders
- low shadow usage
- typography-led hierarchy

### Typography

Match the ScrapingBee-like system:

- Sans stack: `Circular Std` style fallback stack
- Mono stack: `IBM Plex Mono`

Use:

- sans for app UI and headlines
- mono for metadata, pills, table labels, numbers when appropriate

### Color Direction

Use the warm editorial palette, not the old blue finance palette.

Visual targets:

- paper / cream backgrounds
- dark brown / ink navigation
- copper / tan accents
- dark readable body text
- secondary text must still pass visual contrast comfortably

Avoid:

- cool blue gradients as the dominant product language
- low-contrast beige-on-beige text
- translucent glassmorphism
- deep nested panels

### Layout Rules

- Prefer flat sections separated by borders and spacing.
- Avoid boxes inside boxes unless the inner box serves a real workflow purpose.
- Keep radii at `0` unless the user explicitly asks otherwise.
- Headers should be clear and restrained.
- Dashboard should lead with month summary and next action.
- Imports should feel like a review desk.
- Categories should feel like a management surface, ideally closer to structured admin/editorial tables than stacked mini-cards.
- History should read like an archive, not like another dashboard.

## UX Requirements

- The most important action must be obvious on each page.
- Empty states should read intentionally, not like missing content.
- Loading states should not leave the app looking broken.
- Active navigation and selected rows must be clearly visible.
- Small labels and metadata must remain readable.
- Review tables should prioritize editability and legibility over decoration.

## Page Intent

### Dashboard

Purpose:

- show current month posture
- show what needs review next
- summarize category concentration
- provide quick import access without making upload the main story

### Imports

Purpose:

- manage import intake
- review staged statement rows
- inspect historical imports
- commit only after review

### Categories

Purpose:

- manage taxonomy cleanly
- separate expense and income categories
- support rename, reorder, merge, deactivate

### History

Purpose:

- show reviewed transactions
- show imported summary snapshots
- show historical line items

## Development Commands

Install:

```bash
npm install
```

Run local dev:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Tests:

```bash
npm run test
```

Apply local D1 migrations:

```bash
npm run db:migrate:local
```

Apply remote D1 migrations:

```bash
npm run db:migrate:remote
```

Deploy:

```bash
npm run deploy
```

## Cloudflare Notes

- Update `wrangler.jsonc` with the real D1 `database_id`.
- Use `OPENAI_API_KEY` as a Wrangler secret.
- Production should sit behind Cloudflare Access.
- `REQUIRE_CLOUDFLARE_ACCESS` should be enabled in production.

## Parsing Notes

- CSV historical summary support is real and should remain stable.
- PDF statement parsing is still heuristic and should be improved when issuer samples are available.
- Do not assume a single bank/card schema.
- Prefer parser adapters and issuer-specific parsing modules over one giant parser.

## Testing and Verification Expectations

When editing UI:

- run `npm run lint`
- run `npm run build`
- use Playwright screenshots against the live app when layout or visual quality is being changed

When editing import or storage logic:

- preserve existing import/history behavior
- make sure historical entries still appear in API responses
- do not regress review-before-commit flow

## Change Safety Rules

- Do not reintroduce the old blue-heavy palette unless the user asks.
- Do not reintroduce rounded “soft SaaS cards” by default.
- Do not remove routing and turn the app back into a single-screen flow.
- Do not drop historical line-item storage.
- Do not auto-commit imported statement rows.

## If Unsure

Prefer these priorities, in order:

1. preserve data correctness
2. preserve review-first workflow
3. preserve the flat editorial visual system
4. improve clarity before adding decoration
