import type { D1Database } from '@cloudflare/workers-types'
import type {
  CategoryTrend,
  DashboardCategorySummary,
  DashboardMonthSummary,
  DashboardResponse,
} from '../../shared/types'
import {
  allRows,
  mapImportSummary,
  normalizeTrendRow,
} from '../db'

type TrendRow = {
  month: string
  total_cents: number
}

async function loadTrend(db: D1Database): Promise<DashboardMonthSummary[]> {
  const transactionRows = await allRows<TrendRow>(
    db,
    `SELECT statement_month AS month, SUM(amount_cents) AS total_cents
     FROM transactions
     WHERE statement_month IS NOT NULL AND deleted_at IS NULL
     GROUP BY statement_month`,
  )

  return transactionRows.map(normalizeTrendRow).sort((left, right) => right.month.localeCompare(left.month))
}

async function loadBreakdown(
  db: D1Database,
  month: string,
): Promise<{ totalCents: number; categoryBreakdown: DashboardCategorySummary[] }> {
  const transactionRows = await allRows<{
    category_id: string | null
    category_name: string | null
    amount_cents: number
  }>(
    db,
    `SELECT t.category_id, c.name AS category_name, SUM(t.amount_cents) AS amount_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.statement_month = ? AND t.deleted_at IS NULL
     GROUP BY t.category_id, c.name
     ORDER BY amount_cents DESC`,
    month,
  )

  return {
    totalCents: transactionRows.reduce((sum, row) => sum + row.amount_cents, 0),
    categoryBreakdown: transactionRows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name ?? 'Uncategorized',
      amountCents: row.amount_cents,
      source: 'transactions' as const,
    })),
  }
}

async function loadCategoryTrends(db: D1Database): Promise<CategoryTrend[]> {
  const rows = await allRows<{
    statement_month: string
    category_id: string
    category_name: string | null
    amount_cents: number
  }>(
    db,
    `SELECT t.statement_month, t.category_id, c.name AS category_name, SUM(t.amount_cents) AS amount_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.statement_month IS NOT NULL AND t.category_id IS NOT NULL AND t.deleted_at IS NULL
     GROUP BY t.statement_month, t.category_id
     ORDER BY t.statement_month, amount_cents DESC`,
  )

  const byCategory = new Map<string, CategoryTrend>()
  for (const row of rows) {
    let trend = byCategory.get(row.category_id)
    if (!trend) {
      trend = {
        categoryId: row.category_id,
        categoryName: row.category_name ?? 'Uncategorized',
        monthlyAmounts: [],
      }
      byCategory.set(row.category_id, trend)
    }
    trend.monthlyAmounts.push({
      month: row.statement_month,
      amountCents: row.amount_cents,
    })
  }

  return [...byCategory.values()]
    .filter((t) => t.monthlyAmounts.length >= 2)
    .sort((a, b) => {
      const totalA = a.monthlyAmounts.reduce((sum, m) => sum + m.amountCents, 0)
      const totalB = b.monthlyAmounts.reduce((sum, m) => sum + m.amountCents, 0)
      return totalB - totalA
    })
}

export async function getDashboard(
  db: D1Database,
  selectedMonth?: string | null,
): Promise<DashboardResponse> {
  const trend = await loadTrend(db)
  const currentMonth = selectedMonth || trend[0]?.month || new Date().toISOString().slice(0, 7)
  const [breakdown, categoryTrends, recentImports] = await Promise.all([
    loadBreakdown(db, currentMonth),
    loadCategoryTrends(db),
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
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 6`,
    ),
  ])

  return {
    currentMonth,
    totalCents: breakdown.totalCents,
    source: 'transactions',
    categoryBreakdown: breakdown.categoryBreakdown,
    trend,
    categoryTrends,
    recentImports: recentImports.map(mapImportSummary),
  }
}
