import type { CategoryKind } from '../shared/types'

const monthNames = new Map<string, number>([
  ['jan', 1],
  ['feb', 2],
  ['mar', 3],
  ['apr', 4],
  ['may', 5],
  ['jun', 6],
  ['jul', 7],
  ['aug', 8],
  ['sep', 9],
  ['oct', 10],
  ['nov', 11],
  ['dec', 12],
])

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function normalizeMerchant(value: string): string {
  return value
    .toLowerCase()
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseMoneyToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }

  const raw = String(value).trim()
  if (!raw) {
    return null
  }

  const negative = raw.includes('(') || raw.startsWith('-') || raw.endsWith('CR')
  const cleaned = raw
    .replace(/[,$]/g, '')
    .replace(/CR|DR/gi, '')
    .replace(/[()]/g, '')
    .trim()

  const parsed = Number.parseFloat(cleaned)
  if (Number.isNaN(parsed)) {
    return null
  }

  const cents = Math.round(parsed * 100)
  return negative ? -Math.abs(cents) : cents
}

export function formatMonth(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

export function inferMonthFromFilename(filename: string): string | null {
  const normalized = filename.toLowerCase()
  const monthMatch = normalized.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s._-]*(\d{2,4})\b/,
  )
  if (!monthMatch) {
    return null
  }

  const month = monthNames.get(monthMatch[1].slice(0, 3))
  if (!month) {
    return null
  }

  let year = Number.parseInt(monthMatch[2], 10)
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000
  }

  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseDateToIso(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const raw = value.trim()
  if (!raw) {
    return null
  }

  const normalized = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/\./g, '/')
    .replace(/-/g, '/')

  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(normalized)) {
    const [partA, partB, partC] = normalized.split('/')
    const year = partC.length === 2 ? `20${partC}` : partC
    return `${year}-${partA.padStart(2, '0')}-${partB.padStart(2, '0')}`
  }

  const date = new Date(raw)
  if (!Number.isNaN(date.valueOf())) {
    return date.toISOString().slice(0, 10)
  }

  return null
}

export function parseMonthFromDateish(value: string | null | undefined): string | null {
  const iso = parseDateToIso(value)
  return iso ? iso.slice(0, 7) : null
}

export function pickStatementMonth(filename: string, dates: Array<string | null>): string | null {
  for (const value of dates) {
    const month = parseMonthFromDateish(value)
    if (month) {
      return month
    }
  }

  return inferMonthFromFilename(filename)
}

export function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function toImportMetadata(value: string | null | undefined) {
  if (!value) {
    return { parser: 'unknown', notes: [], warnings: [] }
  }

  try {
    const parsed = JSON.parse(value) as {
      parser?: string
      notes?: string[]
      warnings?: string[]
    }

    return {
      parser: parsed.parser ?? 'unknown',
      notes: parsed.notes ?? [],
      warnings: parsed.warnings ?? [],
    }
  } catch {
    return { parser: 'unknown', notes: [], warnings: [] }
  }
}

export function ensureCategoryKind(value: string | null | undefined): CategoryKind {
  return value === 'income' ? 'income' : 'expense'
}
