import { parseStatementCsv } from './statementCsv'
import { parseStatementPdf } from './statementPdf'
import type { ParsedFileResult } from './types'

export async function parseUpload(
  file: File,
): Promise<ParsedFileResult> {
  const filename = file.name
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    return parseStatementPdf(file, filename)
  }

  if (lower.endsWith('.csv')) {
    const text = await file.text()
    return parseStatementCsv(text, filename)
  }

  throw new Error('Unsupported file type. Upload a CSV or PDF export.')
}
