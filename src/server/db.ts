import type { D1Database, D1Result } from '@cloudflare/workers-types'
import type {
  Category,
  DashboardMonthSummary,
  HistoricalEntry,
  ImportRow,
  ImportSummary,
  MonthlySnapshot,
  TransactionRecord,
} from '../shared/types'
import { toImportMetadata } from './utils'

export async function allRows<T>(
  db: D1Database,
  query: string,
  ...bindings: unknown[]
): Promise<T[]> {
  const result = await db.prepare(query).bind(...bindings).all<T>()
  return (result.results ?? []) as T[]
}

export async function firstRow<T>(
  db: D1Database,
  query: string,
  ...bindings: unknown[]
): Promise<T | null> {
  const result = await db.prepare(query).bind(...bindings).first<T>()
  return result ?? null
}

export async function runStatement(
  db: D1Database,
  query: string,
  ...bindings: unknown[]
): Promise<D1Result> {
  return db.prepare(query).bind(...bindings).run()
}

export function mapCategory(row: {
  id: string
  name: string
  slug: string
  kind: string
  sort_order: number
  is_active: number
}): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind === 'income' ? 'income' : 'expense',
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  }
}

export function mapImportSummary(row: {
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
}): ImportSummary {
  return {
    id: row.id,
    filename: row.filename,
    importMode: row.import_mode as ImportSummary['importMode'],
    sourceType: row.source_type as ImportSummary['sourceType'],
    statementMonth: row.statement_month,
    currency: row.currency,
    parsingStatus: row.parsing_status as ImportSummary['parsingStatus'],
    commitStatus: row.commit_status as ImportSummary['commitStatus'],
    rowCount: row.row_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: toImportMetadata(row.metadata_json),
  }
}

export function mapImportRow(row: {
  id: string
  import_id: string
  occurred_at: string | null
  merchant_raw: string
  description_raw: string
  amount_cents: number
  currency: string
  source_type: string
  statement_month: string | null
  suggested_category_id: string | null
  suggestion_confidence: number | null
  final_category_id: string | null
  review_status: string
  is_excluded: number
  parser_label: string
  raw_line: string
  ai_reasoning: string
}): ImportRow {
  return {
    id: row.id,
    importId: row.import_id,
    occurredAt: row.occurred_at,
    merchantRaw: row.merchant_raw,
    descriptionRaw: row.description_raw,
    amountCents: row.amount_cents,
    currency: row.currency,
    sourceType: row.source_type as ImportRow['sourceType'],
    statementMonth: row.statement_month,
    suggestedCategoryId: row.suggested_category_id,
    suggestionConfidence: row.suggestion_confidence,
    finalCategoryId: row.final_category_id,
    reviewStatus: row.review_status as ImportRow['reviewStatus'],
    isExcluded: row.is_excluded === 1,
    parserLabel: row.parser_label,
    rawLine: row.raw_line,
    aiReasoning: row.ai_reasoning,
  }
}

export function mapMonthlySnapshot(row: {
  id: string
  import_id: string
  month: string
  category_id: string | null
  amount_cents: number
  currency: string
  section: string
  note: string
}): MonthlySnapshot {
  return {
    id: row.id,
    importId: row.import_id,
    month: row.month,
    categoryId: row.category_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    section: row.section === 'income' ? 'income' : 'expense',
    note: row.note,
  }
}

export function mapHistoricalEntry(row: {
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
}): HistoricalEntry {
  return {
    id: row.id,
    importId: row.import_id,
    snapshotId: row.snapshot_id,
    month: row.month,
    categoryId: row.category_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    section: row.section === 'income' ? 'income' : 'expense',
    displayOrder: row.display_order,
    entryLabel: row.entry_label,
    rowNote: row.row_note,
    sourceRowIndex: row.source_row_index,
    sourceColumnIndex: row.source_column_index,
  }
}

export function mapTransactionRecord(row: {
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
}): TransactionRecord {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    merchantRaw: row.merchant_raw,
    descriptionRaw: row.description_raw,
    amountCents: row.amount_cents,
    currency: row.currency,
    statementMonth: row.statement_month,
    categoryId: row.category_id,
    categoryName: row.category_name,
    sourceType: row.source_type as TransactionRecord['sourceType'],
    createdAt: row.created_at,
  }
}

export function normalizeTrendRow(row: {
  month: string
  total_cents: number
  source: string
}): DashboardMonthSummary {
  return {
    month: row.month,
    totalCents: row.total_cents,
    source: row.source === 'transactions' ? 'transactions' : 'snapshots',
  }
}
