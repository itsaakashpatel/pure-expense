# Pure Expense

Private, review-first expense tracking built with:

- `Vite` + `React`
- `Cloudflare Workers` + `D1`
- `@knadh/oat` for base UI styling
- `OpenAI` for transaction categorization

## What it does

- Imports old spreadsheet-style monthly summary CSVs as historical monthly snapshots.
- Accepts new monthly `CSV` and `PDF` statement uploads.
- Runs AI-assisted categorization for staged statement rows.
- Lets you review, edit, exclude, and commit rows before they become transactions.
- Learns merchant rules when you override an AI suggestion.
- Protects the app with Cloudflare Access headers in production.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply the D1 schema locally:

   ```bash
   npm run db:migrate:local
   ```

3. Add your secrets:

   ```bash
   wrangler secret put OPENAI_API_KEY
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Important config

- Update `wrangler.jsonc` with your real D1 `database_id`.
- Set `REQUIRE_CLOUDFLARE_ACCESS` to `"true"` in production once Access is in front of the Worker.
- Optionally set `ACCESS_EMAIL_ALLOWLIST` as a comma-separated Wrangler secret or env var for an extra single-user check.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run db:migrate:local`
- `npm run db:migrate:remote`
- `npm run deploy`

## Notes

- The PDF parser is intentionally a placeholder heuristic until issuer samples are provided.
- Historical summary CSV imports preserve monthly category totals instead of fabricating transaction rows.
