import type { D1Database } from '@cloudflare/workers-types'
import type {
  BulkDeleteTransactionsRequest,
  BulkUpdateTransactionsRequest,
  TransactionRecord,
  TransactionsResponse,
  UpdateTransactionRequest,
} from '../../shared/types'
import { allRows, firstRow, mapTransactionRecord, normalizeTrendRow, runStatement } from '../db'

type TrendRow = { month: string; total_cents: number }

type TransactionRow = {
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
  is_confirmed: number
  created_at: string
}

const TRANSACTION_SELECT = `
  SELECT t.id, t.occurred_at, t.merchant_raw, t.description_raw, t.amount_cents, t.currency,
         t.statement_month, t.category_id, c.name AS category_name, t.source_type,
         t.is_confirmed, t.created_at
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE t.deleted_at IS NULL
`

export async function listTransactions(
  db: D1Database,
  month?: string | null,
  offset?: number,
  limit?: number,
): Promise<TransactionsResponse> {
  const trendRows = await allRows<TrendRow>(
    db,
    `SELECT statement_month AS month, SUM(amount_cents) AS total_cents
     FROM transactions
     WHERE statement_month IS NOT NULL AND deleted_at IS NULL
     GROUP BY statement_month
     ORDER BY statement_month DESC`,
  )
  const months = trendRows.map(normalizeTrendRow)
  const effectiveMonth = month || months[0]?.month || new Date().toISOString().slice(0, 7)

  const safeLimit = Math.min(limit && limit > 0 ? limit : 50, 200)
  const safeOffset = offset && offset > 0 ? offset : 0

  const countRow = await firstRow<{ total: number }>(
    db,
    `SELECT COUNT(*) AS total
     FROM transactions t
     WHERE t.statement_month = ? AND t.deleted_at IS NULL`,
    effectiveMonth,
  )
  const total = countRow?.total ?? 0

  const transactions = await allRows<TransactionRow>(
    db,
    `${TRANSACTION_SELECT}
     WHERE t.statement_month = ?
     ORDER BY t.occurred_at DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    effectiveMonth,
    safeLimit,
    safeOffset,
  )

  return {
    selectedMonth: effectiveMonth,
    months,
    transactions: transactions.map(mapTransactionRecord),
    total,
    offset: safeOffset,
    limit: safeLimit,
  }
}

export async function updateTransaction(
  db: D1Database,
  payload: UpdateTransactionRequest,
): Promise<TransactionRecord> {
  const existing = await firstRow<{ id: string }>(
    db,
    `SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL`,
    payload.id,
  )
  if (!existing) throw new Error('Transaction not found.')

  const parts: string[] = []
  const values: unknown[] = []

  if ('categoryId' in payload) {
    parts.push('category_id = ?')
    values.push(payload.categoryId ?? null)
  }
  if ('isConfirmed' in payload) {
    parts.push('is_confirmed = ?')
    values.push(payload.isConfirmed ? 1 : 0)
  }

  if (parts.length) {
    values.push(payload.id)
    await runStatement(db, `UPDATE transactions SET ${parts.join(', ')} WHERE id = ?`, ...values)
  }

  const updated = await firstRow<TransactionRow>(
    db,
    `${TRANSACTION_SELECT} WHERE t.id = ?`,
    payload.id,
  )
  if (!updated) throw new Error('Transaction not found after update.')
  return mapTransactionRecord(updated)
}

export async function deleteTransaction(db: D1Database, id: string): Promise<void> {
  const existing = await firstRow<{ id: string }>(
    db,
    `SELECT id FROM transactions WHERE id = ?`,
    id,
  )
  if (!existing) throw new Error('Transaction not found.')
  await runStatement(db, `UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
}

export async function bulkUpdateTransactions(
  db: D1Database,
  payload: BulkUpdateTransactionsRequest,
): Promise<void> {
  if (!payload.ids.length) return

  const placeholders = payload.ids.map(() => '?').join(', ')

  if ('categoryId' in payload) {
    await runStatement(
      db,
      `UPDATE transactions SET category_id = ? WHERE id IN (${placeholders})`,
      payload.categoryId ?? null,
      ...payload.ids,
    )
  }
  if ('isConfirmed' in payload) {
    await runStatement(
      db,
      `UPDATE transactions SET is_confirmed = ? WHERE id IN (${placeholders})`,
      payload.isConfirmed ? 1 : 0,
      ...payload.ids,
    )
  }
}

export async function bulkDeleteTransactions(
  db: D1Database,
  payload: BulkDeleteTransactionsRequest,
): Promise<void> {
  if (!payload.ids.length) return
  const placeholders = payload.ids.map(() => '?').join(', ')
  await runStatement(
    db,
    `UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
    ...payload.ids,
  )
}
