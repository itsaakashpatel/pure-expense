# Pure Expense — Claude Reference

This file is the working contract for Claude when making changes in this repository.
It mirrors and extends AGENTS.md with Claude-specific guidance.

## Product Summary

Pure Expense is a private, single-user, review-first personal expense tracker.

Built for:
- importing historical spreadsheet-style monthly CSVs
- importing monthly statement CSV and PDF exports
- AI categorization (OpenAI) with human review before commit
- storing both monthly summaries and line-level entries
- running privately behind Cloudflare Access

## Tech Stack

- Frontend: Vite + React + TypeScript
- Routing: react-router-dom
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- AI: OpenAI API
- Tests: Vitest

## Commands

```bash
npm install           # install
npm run dev           # local dev server
npm run build         # production build
npm run lint          # lint
npm run test          # run tests
npm run db:migrate:local   # apply migrations locally
npm run db:migrate:remote  # apply migrations to production
npm run deploy        # deploy to Cloudflare Workers
```

## Core Product Rules

- Dashboard-first, not upload-first.
- Statement imports stay staged until the user approves them.
- AI suggestions are advisory only — never auto-commit.
- Historical imports preserve original monthly totals.
- Historical imports also store line-level entries when available.
- Merchant/category corrections are reusable via merchant_rules.
- Production is protected by Cloudflare Access.

## Data Model — Do Not Simplify

Keep these concepts intact:

- `categories`
- `monthly_snapshots`
- `historical_entries`
- `imports`
- `import_rows`
- `transactions`
- `merchant_rules`
- `ai_suggestions`

Historical imports must support both month/category summary totals AND per-entry imported values.

## Import Workflow

Two paths:

1. **historical-summary** — spreadsheet-style CSV. Preserve monthly category totals + line items. Do not invent statement transactions.
2. **statement** — monthly card/bank CSV or PDF. Parse → AI categorize → human review → commit only approved rows.

## API Contract

```
POST   /api/imports
GET    /api/imports
GET    /api/imports/:id
POST   /api/imports/:id/categorize
POST   /api/imports/:id/commit
GET    /api/dashboard
GET    /api/categories
POST   /api/categories
PATCH  /api/categories
GET    /api/transactions
```

## Visual Design System

The design language is a **flat editorial SaaS** style inspired by ScrapingBee (https://www.scrapingbee.com/).

### Palette

| Token        | Value       | Usage                              |
|-------------|-------------|-------------------------------------|
| `--bg`       | `#faf8f4`   | Page background (warm paper)        |
| `--bg-subtle`| `#f4f1ec`   | Subtle section background           |
| `--panel`    | `#ffffff`   | Card/panel backgrounds              |
| `--text-strong` | `#1a140f` | Headings, primary text             |
| `--text-base`| `#2d221b`   | Body text                           |
| `--text-soft`| `#6b5748`   | Secondary / meta text               |
| `--accent`   | `#bf6f43`   | Copper — primary action color       |
| `--accent-light` | `#d7aa7d` | Accent hover / fill               |
| `--nav-bg`   | `#1e1410`   | Dark ink sidebar                    |
| `--line`     | `rgba(61,45,31,0.1)` | Card borders               |
| `--line-strong` | `rgba(61,45,31,0.18)` | Stronger borders           |

Avoid:
- Cool blue gradients
- Low-contrast beige-on-beige text
- Glassmorphism / backdrop-filter effects
- Rounded corner SaaS cards

### Typography

- Sans: `Circular Std`, `Avenir Next`, `Inter`, system-ui
- Mono: `IBM Plex Mono` — use for metadata, pills, numbers, table labels
- Headings: heavy weight, tight letter-spacing (`-0.04em`)
- Overlines: mono, uppercase, small, copper accent

### Layout Rules

- `border-radius: 0` everywhere by default.
- Flat sections separated by 1px borders and spacing.
- No boxes inside boxes unless structurally necessary.
- No backdrop-filter/blur on content cards.
- No decorative gradients on content area surfaces.
- No `box-shadow` on standard cards.

### Sidebar / Navigation

- Dark ink background (`--nav-bg: #1e1410`)
- Light text (`rgba(255, 247, 238, 0.92)`)
- Active nav link: copper left border strip + subtle copper background tint
- Sticky on desktop

### Buttons

- Default: white/cream background, 1px `--line-strong` border
- Accent/primary: solid copper background, white text, no gradient
- All buttons: `border-radius: 0`, `cursor: pointer`
- Hover: translate up 1px, slightly darker border

### Form Controls

- `border-radius: 0` on all inputs, selects, textareas
- White background, `--line-strong` border
- Min height 44px for usability

### Tables / Lists

- Rows separated by 1px bottom border (`--line`)
- No background on rows (transparent)
- Hover: very subtle cream tint
- Active/selected rows: copper left inset border

## Page Intent

| Page       | Purpose |
|------------|---------|
| Dashboard  | Month summary, review queue, category map, trend |
| Imports    | Import intake, staged review, commit |
| Categories | Taxonomy management — rename, reorder, merge |
| History    | Reviewed transactions, snapshots, historical line items |

## Safety Rules

- Do NOT reintroduce the old blue-heavy finance palette.
- Do NOT reintroduce rounded soft-SaaS cards.
- Do NOT remove routing or flatten the app to a single screen.
- Do NOT drop historical line-item storage.
- Do NOT auto-commit statement rows.

## When Editing UI

1. Run `npm run lint`
2. Run `npm run build`
3. Use Playwright screenshots against the live app for visual changes.

## Priority Order When Unsure

1. Preserve data correctness
2. Preserve review-first workflow
3. Preserve the flat editorial visual system
4. Improve clarity before adding decoration
