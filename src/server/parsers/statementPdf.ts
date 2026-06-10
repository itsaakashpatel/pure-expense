import { pickStatementMonth, parseDateToIso, parseMoneyToCents } from '../utils'
import type { ParsedFileResult, ParsedImportRow } from './types'
import { tryParseAmexPdf } from './amexPdf'

function decodePdfBinary(buffer: ArrayBuffer): string {
  return new TextDecoder('latin1').decode(buffer)
}

function extractLiteralStrings(raw: string): string[] {
  const matches = raw.match(/\((?:\\.|[^\\()])*\)/g) ?? []
  return matches
    .map((value) =>
      value
        .slice(1, -1)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .trim(),
    )
    .filter(Boolean)
}

function parseHeuristicLines(lines: string[], filename: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = []

  for (const line of lines) {
    const match = line.match(
      /(?<date>\d{4}[/-]\d{2}[/-]\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(?<merchant>.+?)\s+(?<amount>-?\$?\(?\d[\d,]*\.\d{2}\)?)/,
    )

    if (!match?.groups) {
      continue
    }

    const occurredAt = parseDateToIso(match.groups.date)
    const amountCents = parseMoneyToCents(match.groups.amount)
    if (amountCents === null) {
      continue
    }

    rows.push({
      occurredAt,
      merchantRaw: match.groups.merchant.trim(),
      descriptionRaw: line.trim(),
      amountCents,
      currency: 'CAD',
      sourceType: 'statement_pdf',
      statementMonth: pickStatementMonth(filename, [occurredAt]),
      parserLabel: 'statement-pdf/heuristic',
      rawLine: line.trim(),
    })
  }

  return rows
}

export async function parseStatementPdf(
  file: File,
  filename: string,
): Promise<ParsedFileResult> {
  // Try Amex-specific parser first (handles Amex Cobalt / any Amex CA statement)
  const amexResult = await tryParseAmexPdf(file)
  if (amexResult) return amexResult

  // ── Generic heuristic fallback ──────────────────────────────────
  const buffer = await file.arrayBuffer()
  const raw = decodePdfBinary(buffer)
  const literalStrings = extractLiteralStrings(raw)
  const lines = literalStrings
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 4)

  const rows = parseHeuristicLines(lines, filename)
  const warnings =
    rows.length === 0
      ? [
          'The PDF importer is a best-effort placeholder until you provide statement samples. This upload was accepted, but no rows could be parsed yet.',
        ]
      : []

  return {
    importMode: 'statement',
    sourceType: 'statement_pdf',
    parser: 'statement-pdf/heuristic',
    statementMonth: pickStatementMonth(
      filename,
      rows.map((row) => row.occurredAt),
    ),
    currency: 'CAD',
    rows,
    notes: [],
    warnings,
  }
}
