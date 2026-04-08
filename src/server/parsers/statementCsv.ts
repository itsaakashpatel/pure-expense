import { pickStatementMonth, parseDateToIso, parseMoneyToCents } from '../utils'
import { parseCsvObjects, parseCsvRows } from './csv'
import type { ParsedFileResult, ParsedImportRow } from './types'

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function findHeader(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const match = headers.find((header) => normalizeHeader(header) === candidate)
    if (match) {
      return match
    }
  }

  return null
}

function resolveAmount(row: Record<string, string>, headers: string[]): number | null {
  const amountHeader = findHeader(headers, ['amount', 'amount cad', 'cad amount', 'total'])
  if (amountHeader) {
    return parseMoneyToCents(row[amountHeader])
  }

  const debitHeader = findHeader(headers, ['debit', 'debits', 'withdrawal'])
  const creditHeader = findHeader(headers, ['credit', 'credits', 'deposit'])
  const debit = debitHeader ? parseMoneyToCents(row[debitHeader]) : null
  const credit = creditHeader ? parseMoneyToCents(row[creditHeader]) : null

  if (debit !== null) {
    return Math.abs(debit)
  }

  if (credit !== null) {
    return -Math.abs(credit)
  }

  return null
}

function buildRow(row: Record<string, string>, headers: string[], filename: string): ParsedImportRow | null {
  const dateHeader = findHeader(headers, [
    'date',
    'transaction date',
    'posted date',
    'posted',
    'trans date',
  ])
  const merchantHeader = findHeader(headers, [
    'merchant',
    'description',
    'details',
    'transaction',
    'payee',
    'name',
  ])
  const descriptionHeader = findHeader(headers, ['memo', 'details', 'description'])

  const amountCents = resolveAmount(row, headers)
  const merchantRaw = merchantHeader ? row[merchantHeader]?.trim() ?? '' : ''
  const descriptionRaw = descriptionHeader ? row[descriptionHeader]?.trim() ?? '' : ''

  if (amountCents === null || (!merchantRaw && !descriptionRaw)) {
    return null
  }

  const occurredAt = parseDateToIso(dateHeader ? row[dateHeader] : null)
  return {
    occurredAt,
    merchantRaw: merchantRaw || descriptionRaw || filename,
    descriptionRaw,
    amountCents,
    currency: 'CAD',
    sourceType: 'statement_csv',
    statementMonth: pickStatementMonth(filename, [occurredAt]),
    parserLabel: 'statement-csv/generic',
    rawLine: JSON.stringify(row),
  }
}

export function parseStatementCsv(text: string, filename: string): ParsedFileResult {
  const headers = (parseCsvRows(text)[0] ?? []).map((header) => header.trim())
  const rows = parseCsvObjects(text)
    .map((row) => buildRow(row, headers, filename))
    .filter((row): row is ParsedImportRow => row !== null)

  const warnings: string[] = []
  if (!rows.length) {
    warnings.push(
      'The CSV did not match the generic statement parser. You can still upload the file, but it may need an issuer-specific parser sample later.',
    )
  }

  return {
    importMode: 'statement',
    sourceType: 'statement_csv',
    parser: 'statement-csv/generic',
    statementMonth: pickStatementMonth(
      filename,
      rows.map((row) => row.occurredAt),
    ),
    currency: 'CAD',
    rows,
    snapshots: [],
    historicalEntries: [],
    notes: [],
    warnings,
  }
}
