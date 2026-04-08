import type { CategoryKind, ImportMode, SourceType } from '../../shared/types'

export interface ParsedImportRow {
  occurredAt: string | null
  merchantRaw: string
  descriptionRaw: string
  amountCents: number
  currency: string
  sourceType: SourceType
  statementMonth: string | null
  parserLabel: string
  rawLine: string
}

export interface ParsedSummarySnapshot {
  month: string
  categoryName: string
  amountCents: number
  section: CategoryKind
  note: string
}

export interface ParsedHistoricalEntry {
  month: string
  categoryName: string
  amountCents: number
  section: CategoryKind
  displayOrder: number
  entryLabel: string
  rowNote: string
  sourceRowIndex: number
  sourceColumnIndex: number
}

export interface ParsedFileResult {
  importMode: ImportMode
  sourceType: SourceType
  parser: string
  statementMonth: string | null
  currency: string
  rows: ParsedImportRow[]
  snapshots: ParsedSummarySnapshot[]
  historicalEntries: ParsedHistoricalEntry[]
  notes: string[]
  warnings: string[]
}
