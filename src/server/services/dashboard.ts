import type { D1Database } from '@cloudflare/workers-types'
import type {
  DashboardCategorySummary,
  DashboardMonthSummary,
  DashboardResponse,
  TransactionsResponse,
} from '../../shared/types'
import {
  allRows,
  mapHistoricalEntry,
  mapImportSummary,
  mapMonthlySnapshot,
  mapTransactionRecord,
  normalizeTrendRow,
} from '../db'

type TrendRow = {
  month: string
  total_cents: number
  source: 'transactions' | 'snapshots'
}

function pickEffectiveMonths(
  transactions: DashboardMonthSummary[],
  snapshots: DashboardMonthSummary[],
): DashboardMonthSummary[] {
  const byMonth = new Map<string, DashboardMonthSummary>()
  for (const row of snapshots) {
    byMonth.set(row.month, row)
  }
  for (const row of transactions) {
    byMonth.set(row.month, row)
  }

  return [...byMonth.values()].sort((left, right) => right.month.localeCompare(left.month))
}

async function loadTrend(db: D1Database): Promise<DashboardMonthSummary[]> {
  const [transactionRows, snapshotRows] = await Promise.all([
    allRows<TrendRow>(
      db,
      `SELECT statement_month AS month, SUM(amount_cents) AS total_cents, 'transactions' AS source
       FROM transactions
       WHERE statement_month IS NOT NULL
       GROUP BY statement_month`,
    ),
    allRows<TrendRow>(
      db,
      `SELECT month, SUM(amount_cents) AS total_cents, 'snapshots' AS source
       FROM monthly_snapshots
       WHERE section = 'expense'
       GROUP BY month`,
    ),
  ])

  return pickEffectiveMonths(transactionRows.map(normalizeTrendRow), snapshotRows.map(normalizeTrendRow))
}

async function loadBreakdown(
  db: D1Database,
  month: string,
): Promise<{ totalCents: number; source: 'transactions' | 'snapshots'; categoryBreakdown: DashboardCategorySummary[] }> {
  const transactionRows = await allRows<{
    category_id: string | null
    category_name: string | null
    amount_cents: number
  }>(
    db,
    `SELECT t.category_id, c.name AS category_name, SUM(t.amount_cents) AS amount_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.statement_month = ?
     GROUP BY t.category_id, c.name
     ORDER BY amount_cents DESC`,
    month,
  )

  if (transactionRows.length) {
    return {
      totalCents: transactionRows.reduce((sum, row) => sum + row.amount_cents, 0),
      source: 'transactions',
      categoryBreakdown: transactionRows.map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name ?? 'Uncategorized',
        amountCents: row.amount_cents,
        source: 'transactions',
      })),
    }
  }

  const snapshotRows = await allRows<{
    category_id: string | null
    category_name: string | null
    amount_cents: number
  }>(
    db,
    `SELECT s.category_id, c.name AS category_name, SUM(s.amount_cents) AS amount_cents
     FROM monthly_snapshots s
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.month = ? AND s.section = 'expense'
     GROUP BY s.category_id, c.name
     ORDER BY amount_cents DESC`,
    month,
  )

  return {
    totalCents: snapshotRows.reduce((sum, row) => sum + row.amount_cents, 0),
    source: 'snapshots',
    categoryBreakdown: snapshotRows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name ?? 'Uncategorized',
      amountCents: row.amount_cents,
      source: 'snapshots',
    })),
  }
}

export async function getDashboard(
  db: D1Database,
  selectedMonth?: string | null,
): Promise<DashboardResponse> {
  const trend = await loadTrend(db)
  const currentMonth = selectedMonth || trend[0]?.month || new Date().toISOString().slice(0, 7)
  const [breakdown, recentImports] = await Promise.all([
    loadBreakdown(db, currentMonth),
    allRows<{
      id: string
      filename: string
      import_mode: string
      source_type: string
      statement_month: string | null
      currency: string
      parsing_status: string
      commit_status: string
      row_count: number
      created_at: string
      updated_at: string
      metadata_json: string
    }>(
      db,
      `SELECT id, filename, import_mode, source_type, statement_month, currency,
              parsing_status, commit_status, row_count, created_at, updated_at, metadata_json
       FROM imports
       ORDER BY created_at DESC
       LIMIT 6`,
    ),
  ])

  return {
    currentMonth,
    totalCents: breakdown.totalCents,
    source: breakdown.source,
    categoryBreakdown: breakdown.categoryBreakdown,
    trend,
    recentImports: recentImports.map(mapImportSummary),
  }
}

export async function getTransactions(
  db: D1Database,
  selectedMonth?: string | null,
): Promise<TransactionsResponse> {
  const months = await loadTrend(db)
  const effectiveMonth = selectedMonth || months[0]?.month || new Date().toISOString().slice(0, 7)

  const [transactions, snapshots, historicalEntries] = await Promise.all([
    allRows<{
      id: string
      occurred_at: string | null
      merchant_raw: string
      description_raw: string
      amount_cents: number
      currency: string
      statement_month: string | null
      category_id: string | null
      category_name: string | null
      source_type: string
      created_at: string
    }>(
      db,
      `SELECT t.id, t.occurred_at, t.merchant_raw, t.description_raw, t.amount_cents, t.currency,
              t.statement_month, t.category_id, c.name AS category_name, t.source_type, t.created_at
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.statement_month = ?
       ORDER BY t.occurred_at DESC, t.created_at DESC`,
      effectiveMonth,
    ),
    allRows<{
      id: string
      import_id: string
      month: string
      category_id: string | null
      amount_cents: number
      currency: string
      section: string
      note: string
    }>(
      db,
      `SELECT id, import_id, month, category_id, amount_cents, currency, section, note
       FROM monthly_snapshots
       WHERE month = ?
      ORDER BY section ASC, amount_cents DESC`,
      effectiveMonth,
    ),
    allRows<{
      id: string
      import_id: string
      snapshot_id: string | null
      month: string
      category_id: string | null
      amount_cents: number
      currency: string
      section: string
      display_order: number
      entry_label: string
      row_note: string
      source_row_index: number
      source_column_index: number
    }>(
      db,
      `SELECT id, import_id, snapshot_id, month, category_id, amount_cents, currency, section,
              display_order, entry_label, row_note, source_row_index, source_column_index
       FROM historical_entries
       WHERE month = ?
       ORDER BY category_id ASC, display_order ASC, source_row_index ASC`,
      effectiveMonth,
    ),
  ])

  return {
    selectedMonth: effectiveMonth,
    months,
    transactions: transactions.map(mapTransactionRecord),
    snapshots: snapshots.map(mapMonthlySnapshot),
    historicalEntries: historicalEntries.map(mapHistoricalEntry),
  }
}
