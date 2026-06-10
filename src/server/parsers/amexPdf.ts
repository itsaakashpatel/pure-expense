/**
 * Amex Cobalt Card PDF statement parser.
 *
 * Strategy:
 *  1. Scan the raw PDF binary for content stream objects.
 *  2. FlateDecode-decompress each stream (tries deflate, then deflate-raw).
 *  3. Extract text tokens from BT…ET blocks via Tj / TJ operators.
 *  4. Run a state-machine to find "New Transactions for" sections.
 *  5. Assemble rows with correct per-transaction year (handles Dec–Jan cross-year).
 *
 * Falls back gracefully: returns null if not detected as an Amex statement or
 * if text extraction yields nothing useful.
 */

import { parseMoneyToCents } from '../utils'
import type { ParsedFileResult, ParsedImportRow } from './types'

// ─── Month helpers ────────────────────────────────────────────────────────────

const MONTH_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}

const MONTH_PAD: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

const MONTH_ABBRS = Object.keys(MONTH_NUM).join('|')

// Matches "Jan 4", "Dec 20", "Jan 18" etc.
const DATE_TOKEN_RE = new RegExp(`^(${MONTH_ABBRS})\\s+(\\d{1,2})$`)

// Matches "Jan 4, 2026" / "Dec 22, 2025"
const FULL_DATE_RE = new RegExp(`(${MONTH_ABBRS})\\s+(\\d{1,2}),\\s+(\\d{4})`)

// Matches amounts like 9.84 / -22.39 / 2,193.48 / -2,900.60
const AMOUNT_RE = /^-?[\d,]+\.\d{2}$/

function toIso(monthAbbr: string, day: string, year: number): string {
  return `${year}-${MONTH_PAD[monthAbbr]}-${day.padStart(2, '0')}`
}

/**
 * Infer transaction year.
 * For a Dec-Jan spanning statement, Dec dates get the opening year and Jan
 * dates get the closing year. For same-year statements, use closing year.
 */
function inferYear(
  txMonthAbbr: string,
  openMonth: number,
  openYear: number,
  _closeMonth: number,
  closeYear: number,
): number {
  const mNum = MONTH_NUM[txMonthAbbr] ?? 0
  // Statement spans a year boundary (e.g., December → January)
  if (openYear < closeYear) {
    return mNum >= openMonth ? openYear : closeYear
  }
  return closeYear
}

// ─── FlateDecode decompression ────────────────────────────────────────────────

async function tryDecompress(data: Uint8Array): Promise<Uint8Array | null> {
  // PDF FlateDecode is zlib-wrapped (2-byte header + deflate + checksum).
  // 'deflate' covers the zlib wrapper; 'deflate-raw' covers bare deflate.
  for (const fmt of ['deflate', 'deflate-raw'] as CompressionFormat[]) {
    try {
      const ds = new DecompressionStream(fmt)
      const writer = ds.writable.getWriter()
      const reader = ds.readable.getReader()
      // Cast to satisfy strict ArrayBuffer vs ArrayBufferLike constraint
      writer.write(data as unknown as Uint8Array<ArrayBuffer>)
      writer.close()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      const total = chunks.reduce((s, c) => s + c.length, 0)
      const out = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { out.set(c, off); off += c.length }
      return out
    } catch {
      // try the other format
    }
  }
  return null
}

// ─── PDF content-stream text extraction ──────────────────────────────────────

function decodePdfLiteralStr(raw: string): string {
  return raw
    .slice(1, -1)
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .trim()
}

/**
 * Extract text tokens from a single decompressed PDF content stream.
 * Processes BT…ET text blocks and picks up Tj and TJ operators.
 */
function extractStreamTokens(content: string): string[] {
  const tokens: string[] = []
  const blocks = content.split(/\bBT\b/)

  for (const block of blocks.slice(1)) {
    const etIdx = block.indexOf('ET')
    const btContent = etIdx >= 0 ? block.slice(0, etIdx) : block

    // (text) Tj
    const tjRe = /\((?:\\.|[^\\()])*\)\s*Tj/g
    let m: RegExpExecArray | null
    while ((m = tjRe.exec(btContent)) !== null) {
      const s = m[0].match(/\((?:\\.|[^\\()])*\)/)![0]
      const decoded = decodePdfLiteralStr(s)
      if (decoded) tokens.push(decoded)
    }

    // [(text) num …] TJ
    const tjArrRe = /\[([^\]]*)\]\s*TJ/g
    while ((m = tjArrRe.exec(btContent)) !== null) {
      const inner = m[1]
      const parts: string[] = []
      const strRe = /\((?:\\.|[^\\()])*\)/g
      let sm: RegExpExecArray | null
      while ((sm = strRe.exec(inner)) !== null) {
        const decoded = decodePdfLiteralStr(sm[0])
        if (decoded) parts.push(decoded)
      }
      if (parts.length) tokens.push(parts.join(''))
    }
  }

  return tokens
}

/**
 * Walk the raw PDF binary, find all stream objects, decompress them, and
 * extract text tokens in page order.
 */
async function extractPdfTextTokens(buffer: ArrayBuffer): Promise<string[]> {
  const pdfBytes = new Uint8Array(buffer)
  const rawText = new TextDecoder('latin1').decode(pdfBytes)
  const all: string[] = []

  let pos = 0
  while (pos < rawText.length) {
    // Locate next 'stream' keyword (not 'endstream')
    let idx = rawText.indexOf('stream', pos)
    if (idx === -1) break
    while (idx !== -1 && rawText.slice(idx, idx + 9) === 'endstream') {
      idx = rawText.indexOf('stream', idx + 9)
    }
    if (idx === -1) break

    // Preceding dictionary (up to ~500 chars back)
    const searchBack = Math.max(0, idx - 600)
    const dict = rawText.slice(searchBack, idx)

    // Must have /Length to know how many bytes to read
    const lenMatch = dict.match(/\/Length\s+(\d+)(?:\s*\n)?/)
    if (!lenMatch) { pos = idx + 6; continue }
    const byteLength = parseInt(lenMatch[1], 10)
    if (byteLength <= 0) { pos = idx + 6; continue }

    const hasFlate = /\/FlateDecode(?:\s|\/|\])/.test(dict)

    // Stream data starts after 'stream' + CRLF or LF
    let dataStart = idx + 6
    if (rawText[dataStart] === '\r') dataStart++
    if (rawText[dataStart] === '\n') dataStart++

    const streamBytes = pdfBytes.slice(dataStart, dataStart + byteLength)

    let contentText: string
    if (hasFlate) {
      const dec = await tryDecompress(streamBytes)
      if (!dec) { pos = dataStart + byteLength; continue }
      contentText = new TextDecoder('latin1').decode(dec)
    } else {
      contentText = new TextDecoder('latin1').decode(streamBytes)
    }

    // Only process when the stream looks like a PDF content stream
    if (contentText.includes('BT') && contentText.includes('Tj')) {
      const tokens = extractStreamTokens(contentText)
      all.push(...tokens)
    }

    pos = dataStart + byteLength
  }

  return all
}

// ─── Amex-specific detection ──────────────────────────────────────────────────

function isAmexStatement(tokens: string[]): boolean {
  const joined = tokens.join(' ')
  return (
    joined.includes('American Express') ||
    joined.includes('AMERICAN EXPRESS') ||
    joined.includes('Cobalt Card') ||
    joined.includes('Statement of Account')
  )
}

// ─── Statement period extraction ─────────────────────────────────────────────

interface StatementPeriod {
  openMonth: number
  openYear: number
  closeMonth: number
  closeYear: number
}

function parseStatementPeriod(tokens: string[]): StatementPeriod | null {
  // Look for two consecutive "Mon DD, YYYY" tokens like "Dec 22, 2025" and "Jan 21, 2026"
  for (let i = 0; i < tokens.length - 1; i++) {
    const m1 = tokens[i].match(FULL_DATE_RE)
    const m2 = tokens[i + 1]?.match(FULL_DATE_RE) ?? null
    if (m1 && m2) {
      const openMonth = MONTH_NUM[m1[1]] ?? 0
      const openYear = parseInt(m1[3], 10)
      const closeMonth = MONTH_NUM[m2[1]] ?? 0
      const closeYear = parseInt(m2[3], 10)
      if (openMonth > 0 && closeMonth > 0 && openYear > 0 && closeYear > 0) {
        return { openMonth, openYear, closeMonth, closeYear }
      }
    }
    // Also match within a single token like "Dec 22, 2025 Jan 21, 2026"
    const combined = tokens[i]
    const all = [...combined.matchAll(new RegExp(FULL_DATE_RE, 'g'))]
    if (all.length >= 2) {
      const [m1a, m2a] = all
      const openMonth = MONTH_NUM[m1a[1]] ?? 0
      const openYear = parseInt(m1a[3], 10)
      const closeMonth = MONTH_NUM[m2a[1]] ?? 0
      const closeYear = parseInt(m2a[3], 10)
      if (openMonth > 0 && closeMonth > 0) {
        return { openMonth, openYear, closeMonth, closeYear }
      }
    }
  }
  return null
}

// ─── Transaction line noise patterns ─────────────────────────────────────────

/** Lines that look like transaction content but should be skipped. */
const SKIP_LINE_RE =
  /^(INSTALLMENT\s+PLAN|MEMBERSHIP\s+FEE\s+INSTALLMENT|MONTHLY\s+INSTALLMENT\s+FEE|Total\s+of|Total\s+Amount|PAYMENT\s+RECEIVED|Reference\s+[A-Z0-9]+|Plan\s+It|For\s+details|If\s+you\s+cancel|You\s+may\s+cancel|Please\s+pay|The\s+following|UNITED\s+STATES\s+DOLLAR|Including\s+Monthly|Statement\s+includes|Customer\s+Service|Page\s+\d+)$/i

// ─── Main transaction parser ──────────────────────────────────────────────────

function parseNewTransactions(tokens: string[], period: StatementPeriod): ParsedImportRow[] {
  const rows: ParsedImportRow[] = []
  let i = 0

  // We may encounter multiple "New Transactions for" (one per cardholder in
  // supplement cards). Process all.
  while (i < tokens.length) {
    // Skip until we find the section header
    if (!/^New Transactions for/i.test(tokens[i])) { i++; continue }
    i++ // consume section header

    // Parse rows until end-of-section marker
    while (i < tokens.length) {
      const tok = tokens[i]

      // End of this section
      if (
        /^Total of New Transactions/i.test(tok) ||
        /^Other Account Transactions/i.test(tok)
      ) {
        i++
        break
      }

      // Try to match a transaction date token e.g. "Jan 4"
      const dateMatch = tok.match(DATE_TOKEN_RE)
      if (!dateMatch) { i++; continue }

      const txMonthAbbr = dateMatch[1]
      const txDay = dateMatch[2]
      const txYear = inferYear(
        txMonthAbbr,
        period.openMonth, period.openYear,
        period.closeMonth, period.closeYear,
      )
      const occurredAt = toIso(txMonthAbbr, txDay, txYear)
      const statementMonth = `${txYear}-${MONTH_PAD[txMonthAbbr]}`
      i++

      // Next token: posting date — consume it if it looks like a date
      if (i < tokens.length && DATE_TOKEN_RE.test(tokens[i])) {
        i++ // skip posting date
      }

      // Collect description tokens until we hit an amount or next date
      const descParts: string[] = []
      let amountCents: number | null = null

      while (i < tokens.length) {
        const t = tokens[i]

        // End of section
        if (
          /^Total of New Transactions/i.test(t) ||
          /^Other Account Transactions/i.test(t)
        ) break

        // Next transaction date — don't consume, outer loop will handle it
        if (DATE_TOKEN_RE.test(t)) break

        // Amount detection
        if (AMOUNT_RE.test(t)) {
          amountCents = parseMoneyToCents(t)
          i++
          break
        }

        // Skip noise
        if (!SKIP_LINE_RE.test(t) && t.length >= 2) {
          descParts.push(t)
        }
        i++
      }

      if (amountCents === null) continue

      // Normalise merchant: first meaningful desc segment
      const merchantRaw = descParts[0]?.trim() ?? 'Unknown'
      const descriptionRaw = descParts.join(' ').trim() || merchantRaw

      rows.push({
        occurredAt,
        merchantRaw,
        descriptionRaw,
        amountCents,
        currency: 'CAD',
        sourceType: 'statement_pdf',
        statementMonth,
        parserLabel: 'statement-pdf/amex-cobalt',
        rawLine: `${tok} ${descriptionRaw} ${(amountCents / 100).toFixed(2)}`,
      })
    }
  }

  return rows
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function tryParseAmexPdf(
  file: File,
): Promise<ParsedFileResult | null> {
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return null
  }

  // Quick check: is this even a PDF?
  const magic = new TextDecoder('latin1').decode(buffer.slice(0, 5))
  if (!magic.startsWith('%PDF-')) return null

  const tokens = await extractPdfTextTokens(buffer)

  if (tokens.length === 0) return null
  if (!isAmexStatement(tokens)) return null

  const period = parseStatementPeriod(tokens)
  if (!period) return null

  const rows = parseNewTransactions(tokens, period)

  if (rows.length === 0) {
    // Detected as Amex but couldn't parse transactions — report clearly
    return {
      importMode: 'statement',
      sourceType: 'statement_pdf',
      parser: 'statement-pdf/amex-cobalt',
      statementMonth: `${period.closeYear}-${String(period.closeMonth).padStart(2, '0')}`,
      currency: 'CAD',
      rows: [],
      notes: [],
      warnings: [
        'Amex statement detected but no transactions could be extracted. ' +
        'The PDF may use an unsupported font encoding — export the statement via ' +
        'the Amex website as a PDF and retry.',
      ],
    }
  }

  // Primary statement month = closing date month
  const statementMonth = `${period.closeYear}-${String(period.closeMonth).padStart(2, '0')}`

  return {
    importMode: 'statement',
    sourceType: 'statement_pdf',
    parser: 'statement-pdf/amex-cobalt',
    statementMonth,
    currency: 'CAD',
    rows,
    notes: [
      `Parsed ${rows.length} transactions from Amex Cobalt Card statement ` +
      `(${period.openYear}-${String(period.openMonth).padStart(2, '0')} → ` +
      `${period.closeYear}-${String(period.closeMonth).padStart(2, '0')}).`,
    ],
    warnings: [],
  }
}
