import type { ImportMode, SourceType } from '../../shared/types'

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

export interface ParsedFileResult {
  importMode: ImportMode
  sourceType: SourceType
  parser: string
  statementMonth: string | null
  currency: string
  rows: ParsedImportRow[]
  notes: string[]
  warnings: string[]
}
