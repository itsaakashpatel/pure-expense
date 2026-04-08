import { parseCsvRows } from './csv'
import { dedupeStrings, inferMonthFromFilename, parseMoneyToCents } from '../utils'
import type { ParsedFileResult } from './types'

function isMeaningfulHeader(value: string): boolean {
  const normalized = value.trim()
  return Boolean(normalized) && normalized.toLowerCase() !== 'category' && normalized !== 'Total'
}

function isLikelyNote(value: string): boolean {
  const trimmed = value.trim()
  return Boolean(trimmed) && parseMoneyToCents(trimmed) === null
}

export function parseHistoricalSummaryCsv(
  text: string,
  filename: string,
): ParsedFileResult {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim()))
  const totals = rows[0] ?? []
  const headers = rows[1] ?? []

  const statementMonth = inferMonthFromFilename(filename)
  const snapshots: ParsedFileResult['snapshots'] = []
  const historicalEntries: ParsedFileResult['historicalEntries'] = []
  const notes: string[] = []
  const warnings: string[] = []
  const categoryDisplayOrder = new Map<string, number>()
  const incomeStartIndex = headers.findIndex((header) => header.trim() === 'GIC')

  let section: 'expense' | 'income' = 'expense'
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]?.trim() ?? ''
    if (!header) {
      continue
    }

    if (header === 'Total') {
      section = 'income'
      continue
    }

    if (!isMeaningfulHeader(header)) {
      continue
    }

    const amountCents = parseMoneyToCents(totals[index])
    if (amountCents === null) {
      warnings.push(`Skipped ${header} because the total cell was empty or invalid.`)
      continue
    }

    snapshots.push({
      month: statementMonth ?? 'unknown-month',
      categoryName: header,
      amountCents: Math.abs(amountCents),
      section,
      note: '',
    })
  }

  for (const [rowOffset, row] of rows.slice(2).entries()) {
    const textCells = row
      .map((cell, index) => ({ cell: cell.trim(), index }))
      .filter(({ cell, index }) => cell && parseMoneyToCents(cell) === null && index !== 0)

    const rowNote = textCells.map(({ cell }) => cell).join(' · ')

    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index]?.trim() ?? ''
      if (!isMeaningfulHeader(header)) {
        continue
      }

      const amountCents = parseMoneyToCents(row[index])
      if (amountCents === null) {
        continue
      }

      const displayOrder = (categoryDisplayOrder.get(header) ?? 0) + 1
      categoryDisplayOrder.set(header, displayOrder)

      historicalEntries.push({
        month: statementMonth ?? 'unknown-month',
        categoryName: header,
        amountCents: Math.abs(amountCents),
        section: incomeStartIndex !== -1 && index >= incomeStartIndex ? 'income' : 'expense',
        displayOrder,
        entryLabel: `${header} entry ${displayOrder}`,
        rowNote,
        sourceRowIndex: rowOffset + 2,
        sourceColumnIndex: index,
      })
    }

    for (const cell of row) {
      if (isLikelyNote(cell)) {
        notes.push(cell.trim())
      }
    }
  }

  if (!statementMonth) {
    warnings.push('Could not infer the month from the filename. Rename the file to include a month if needed.')
  }

  return {
    importMode: 'historical-summary',
    sourceType: 'historical_summary_csv',
    parser: 'historical-summary-csv',
    statementMonth,
    currency: 'CAD',
    rows: [],
    snapshots,
    historicalEntries,
    notes: dedupeStrings(notes),
    warnings: dedupeStrings(warnings),
  }
}
