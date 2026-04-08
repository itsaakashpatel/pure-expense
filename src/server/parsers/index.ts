import { parseHistoricalSummaryCsv } from './historicalSummary'
import { parseStatementCsv } from './statementCsv'
import { parseStatementPdf } from './statementPdf'
import type { ParsedFileResult } from './types'

function isHistoricalSummaryCsv(text: string): boolean {
  // Structural detection: first row is a totals row starting with "Total,"
  // and the second row is a header row starting with "Category,"
  const lines = text.split('\n')
  const firstLine = lines[0]?.trim() ?? ''
  const secondLine = lines[1]?.trim() ?? ''
  return firstLine.startsWith('Total,') && secondLine.startsWith('Category,')
}

export async function parseUpload(
  file: File,
  requestedMode: string | null,
): Promise<ParsedFileResult> {
  const filename = file.name
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    return parseStatementPdf(file, filename)
  }

  const text = await file.text()
  const wantsHistorical = requestedMode === 'historical-summary'
  if (wantsHistorical || (lower.endsWith('.csv') && isHistoricalSummaryCsv(text))) {
    return parseHistoricalSummaryCsv(text, filename)
  }

  if (lower.endsWith('.csv')) {
    return parseStatementCsv(text, filename)
  }

  throw new Error('Unsupported file type. Upload a CSV or PDF export.')
}
