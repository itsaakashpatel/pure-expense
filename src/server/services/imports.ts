import type { D1Database } from '@cloudflare/workers-types'
import type { CommitImportRequest, ImportDetailResponse, ImportSummary } from '../../shared/types'
import {
  allRows,
  firstRow,
  mapImportRow,
  mapImportSummary,
  runStatement,
} from '../db'
import { parseUpload } from '../parsers'
import type { ParsedFileResult } from '../parsers/types'
import { suggestCategoriesWithAI } from './ai'
import { listCategories } from './categories'
import { createId, formatMonth, normalizeMerchant } from '../utils'

type ImportRowRecord = {
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
}

type ImportSummaryRow = {
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
}

type MerchantRuleRow = {
  id: string
  category_id: string
  match_kind: 'exact' | 'contains'
  normalized_key: string
}

function buildMetadata(parsed: ParsedFileResult): string {
  return JSON.stringify({
    parser: parsed.parser,
    notes: parsed.notes,
    warnings: parsed.warnings,
  })
}

function deriveRuleKey(merchantRaw: string, descriptionRaw: string): string {
  return normalizeMerchant(merchantRaw || descriptionRaw)
}

async function loadImportSummary(db: D1Database, importId: string): Promise<ImportSummary> {
  const row = await firstRow<ImportSummaryRow>(
    db,
    `SELECT id, filename, import_mode, source_type, statement_month, currency,
            parsing_status, commit_status, row_count, created_at, updated_at, metadata_json
     FROM imports
     WHERE id = ?
       AND deleted_at IS NULL`,
    importId,
  )

  if (!row) {
    throw new Error('Import not found.')
  }

  return mapImportSummary(row)
}

export async function deleteImport(db: D1Database, importId: string): Promise<void> {
  const existing = await firstRow<{ id: string; commit_status: string; row_count: number }>(
    db,
    `SELECT id, commit_status, row_count FROM imports WHERE id = ? AND deleted_at IS NULL`,
    importId,
  )
  if (!existing) throw new Error('Import not found.')
  if (existing.commit_status === 'committed' && existing.row_count > 0) {
    throw new Error(
      'This import has already been committed. Delete the individual transactions instead.',
    )
  }
  await runStatement(db, `UPDATE imports SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, importId)
}

export async function listImports(db: D1Database): Promise<ImportSummary[]> {
  const rows = await allRows<ImportSummaryRow>(
    db,
    `SELECT id, filename, import_mode, source_type, statement_month, currency,
            parsing_status, commit_status, row_count, created_at, updated_at, metadata_json
     FROM imports
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`,
  )

  return rows.map(mapImportSummary)
}

export async function getImportDetail(
  db: D1Database,
  importId: string,
): Promise<ImportDetailResponse> {
  const [summary, rowRecords, categories] = await Promise.all([
    loadImportSummary(db, importId),
    allRows<ImportRowRecord>(
      db,
      `SELECT id, import_id, occurred_at, merchant_raw, description_raw, amount_cents, currency,
              source_type, statement_month, suggested_category_id, suggestion_confidence,
              final_category_id, review_status, is_excluded, parser_label, raw_line, ai_reasoning
       FROM import_rows
       WHERE import_id = ?
       ORDER BY occurred_at IS NULL, occurred_at ASC, id ASC`,
      importId,
    ),
    listCategories(db),
  ])

  return {
    import: summary,
    rows: rowRecords.map(mapImportRow),
    categories,
  }
}

async function upsertAiSuggestion(
  db: D1Database,
  input: {
    importRowId: string
    provider: string
    model: string
    categoryId: string | null
    confidence: number | null
    reasoning: string
    rawJson: string
  },
): Promise<void> {
  await runStatement(
    db,
    `INSERT INTO ai_suggestions (id, import_row_id, provider, model, prompt_version, category_id, confidence, reasoning, raw_json)
     VALUES (?, ?, ?, ?, 'expense-v1', ?, ?, ?, ?)
     ON CONFLICT(import_row_id) DO UPDATE SET
       provider = excluded.provider,
       model = excluded.model,
       prompt_version = excluded.prompt_version,
       category_id = excluded.category_id,
       confidence = excluded.confidence,
       reasoning = excluded.reasoning,
       raw_json = excluded.raw_json`,
    createId('ais'),
    input.importRowId,
    input.provider,
    input.model,
    input.categoryId,
    input.confidence,
    input.reasoning,
    input.rawJson,
  )
}

async function applyMerchantRuleSuggestions(
  db: D1Database,
  rows: ImportRowRecord[],
): Promise<{ matchedIds: Set<string> }> {
  const rules = await allRows<MerchantRuleRow>(
    db,
    `SELECT id, category_id, match_kind, normalized_key
     FROM merchant_rules
     WHERE is_active = 1
     ORDER BY hit_count DESC, created_at DESC`,
  )

  const matchedIds = new Set<string>()
  for (const row of rows) {
    const key = deriveRuleKey(row.merchant_raw, row.description_raw)
    if (!key) {
      continue
    }

    const rule = rules.find((candidate) =>
      candidate.match_kind === 'exact'
        ? candidate.normalized_key === key
        : key.includes(candidate.normalized_key),
    )

    if (!rule) {
      continue
    }

    matchedIds.add(row.id)
    await runStatement(
      db,
      `UPDATE import_rows
       SET suggested_category_id = ?, final_category_id = ?, suggestion_confidence = ?, review_status = ?, ai_reasoning = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      rule.category_id,
      rule.category_id,
      1,
      'learned-rule',
      'Matched an existing merchant rule.',
      row.id,
    )
    await runStatement(
      db,
      `UPDATE merchant_rules
       SET hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      rule.id,
    )
    await upsertAiSuggestion(db, {
      importRowId: row.id,
      provider: 'merchant_rule',
      model: 'merchant-rule-v1',
      categoryId: rule.category_id,
      confidence: 1,
      reasoning: 'Matched an existing merchant rule.',
      rawJson: JSON.stringify(rule),
    })
  }

  return { matchedIds }
}

export async function categorizeImportRows(
  db: D1Database,
  env: {
    OPENAI_API_KEY?: string
    OPENAI_MODEL?: string
  },
  importId: string,
  force = false,
): Promise<ImportDetailResponse> {
  const [categories, rowRecords] = await Promise.all([
    listCategories(db),
    allRows<ImportRowRecord>(
      db,
      `SELECT id, import_id, occurred_at, merchant_raw, description_raw, amount_cents, currency,
              source_type, statement_month, suggested_category_id, suggestion_confidence,
              final_category_id, review_status, is_excluded, parser_label, raw_line, ai_reasoning
       FROM import_rows
       WHERE import_id = ?
       ORDER BY occurred_at IS NULL, occurred_at ASC, id ASC`,
      importId,
    ),
  ])

  const targetRows = rowRecords.filter((row) => force || !row.suggested_category_id)
  const { matchedIds } = await applyMerchantRuleSuggestions(db, targetRows)

  const aiTargets = targetRows.filter((row) => !matchedIds.has(row.id))
  const suggestions = await suggestCategoriesWithAI(
    env,
    aiTargets.map((row) => ({
      rowId: row.id,
      merchantRaw: row.merchant_raw,
      descriptionRaw: row.description_raw,
      amountCents: row.amount_cents,
    })),
    categories,
  )

  for (const suggestion of suggestions) {
    const reviewStatus = suggestion.confidence >= 0.86 ? 'approved' : 'pending'
    await runStatement(
      db,
      `UPDATE import_rows
       SET suggested_category_id = ?, final_category_id = ?, suggestion_confidence = ?, review_status = ?, ai_reasoning = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      suggestion.categoryId,
      suggestion.categoryId,
      suggestion.confidence,
      reviewStatus,
      suggestion.reasoning,
      suggestion.rowId,
    )

    await upsertAiSuggestion(db, {
      importRowId: suggestion.rowId,
      provider: suggestion.provider,
      model: suggestion.model,
      categoryId: suggestion.categoryId,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      rawJson: suggestion.rawJson,
    })
  }

  await runStatement(
    db,
    `UPDATE imports
     SET parsing_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    suggestions.length || matchedIds.size ? 'review_ready' : 'needs_attention',
    importId,
  )

  return getImportDetail(db, importId)
}

export async function createImportFromFile(
  db: D1Database,
  env: {
    OPENAI_API_KEY?: string
    OPENAI_MODEL?: string
  },
  file: File,
): Promise<ImportDetailResponse> {
  const parsed = await parseUpload(file)
  const importId = createId('imp')
  const statementMonth = parsed.statementMonth ?? formatMonth(new Date())
  const rowCount = parsed.rows.length

  const parsingStatus =
    parsed.rows.length > 0
      ? 'review_ready'
      : parsed.warnings.length
        ? 'awaiting_template'
        : 'needs_attention'

  await runStatement(
    db,
    `INSERT INTO imports (id, filename, import_mode, source_type, statement_month, currency, parsing_status, commit_status, row_count, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    importId,
    file.name,
    'statement',
    parsed.sourceType,
    statementMonth,
    parsed.currency,
    parsingStatus,
    'draft',
    rowCount,
    buildMetadata(parsed),
  )

  for (const row of parsed.rows) {
    await runStatement(
      db,
      `INSERT INTO import_rows (
        id, import_id, occurred_at, merchant_raw, description_raw, amount_cents, currency,
        source_type, statement_month, parser_label, raw_line
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      createId('row'),
      importId,
      row.occurredAt,
      row.merchantRaw,
      row.descriptionRaw,
      row.amountCents,
      row.currency,
      row.sourceType,
      row.statementMonth ?? statementMonth,
      row.parserLabel,
      row.rawLine,
    )
  }

  return categorizeImportRows(db, env, importId)
}

async function upsertMerchantRule(
  db: D1Database,
  row: ImportRowRecord,
  categoryId: string,
): Promise<void> {
  const normalizedKey = deriveRuleKey(row.merchant_raw, row.description_raw)
  if (!normalizedKey) {
    return
  }

  const existing = await firstRow<{ id: string }>(
    db,
    `SELECT id
     FROM merchant_rules
     WHERE normalized_key = ? AND category_id = ?`,
    normalizedKey,
    categoryId,
  )

  if (existing) {
    await runStatement(
      db,
      `UPDATE merchant_rules
       SET is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      existing.id,
    )
    return
  }

  await runStatement(
    db,
    `INSERT INTO merchant_rules (
      id, category_id, match_kind, match_value, normalized_key, created_from_import_row_id
    ) VALUES (?, ?, 'contains', ?, ?, ?)`,
    createId('rule'),
    categoryId,
    normalizedKey,
    normalizedKey,
    row.id,
  )
}

export async function commitImport(
  db: D1Database,
  importId: string,
  payload: CommitImportRequest,
): Promise<ImportDetailResponse> {
  const existingRows = await allRows<ImportRowRecord>(
    db,
    `SELECT id, import_id, occurred_at, merchant_raw, description_raw, amount_cents, currency,
            source_type, statement_month, suggested_category_id, suggestion_confidence,
            final_category_id, review_status, is_excluded, parser_label, raw_line, ai_reasoning
     FROM import_rows
     WHERE import_id = ?`,
    importId,
  )

  const updateMap = new Map(payload.rows.map((row) => [row.id, row]))
  await runStatement(db, 'DELETE FROM transactions WHERE import_id = ?', importId)

  for (const row of existingRows) {
    const next = updateMap.get(row.id)
    const finalCategoryId = next?.finalCategoryId ?? row.final_category_id ?? row.suggested_category_id
    const isExcluded = next?.isExcluded ?? (row.is_excluded === 1 || !finalCategoryId)
    const reviewStatus =
      isExcluded
        ? 'excluded'
        : finalCategoryId !== row.suggested_category_id
          ? 'edited'
          : next?.reviewStatus ?? row.review_status ?? 'approved'

    await runStatement(
      db,
      `UPDATE import_rows
       SET final_category_id = ?, is_excluded = ?, review_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      finalCategoryId,
      Number(isExcluded),
      reviewStatus,
      row.id,
    )

    if (isExcluded || !finalCategoryId) {
      continue
    }

    await runStatement(
      db,
      `INSERT INTO transactions (
        id, import_id, import_row_id, occurred_at, merchant_raw, description_raw,
        amount_cents, currency, category_id, statement_month, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      createId('txn'),
      importId,
      row.id,
      row.occurred_at,
      row.merchant_raw,
      row.description_raw,
      row.amount_cents,
      row.currency,
      finalCategoryId,
      row.statement_month,
      row.source_type,
    )

    if (row.suggested_category_id !== finalCategoryId) {
      await upsertMerchantRule(db, row, finalCategoryId)
    }
  }

  await runStatement(
    db,
    `UPDATE imports
     SET commit_status = 'committed', parsing_status = 'review_ready', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    importId,
  )

  return getImportDetail(db, importId)
}
