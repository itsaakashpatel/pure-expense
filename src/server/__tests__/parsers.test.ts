import { describe, expect, it } from 'vitest'
import { parseStatementCsv } from '../parsers/statementCsv'
import { parseStatementPdf } from '../parsers/statementPdf'

describe('statement csv parser', () => {
  it('normalizes generic statement rows into staged rows', () => {
    const csv = [
      'Date,Description,Amount',
      '2026-04-02,Whole Foods Kitsilano,42.18',
      '2026-04-03,Blenz Coffee,6.40',
    ].join('\n')

    const parsed = parseStatementCsv(csv, 'apr-2026-export.csv')

    expect(parsed.importMode).toBe('statement')
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].merchantRaw).toBe('Whole Foods Kitsilano')
    expect(parsed.rows[0].amountCents).toBe(4218)
    expect(parsed.statementMonth).toBe('2026-04')
  })
})

describe('statement pdf parser', () => {
  it('returns a helpful warning when the placeholder parser cannot extract rows', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'statement.pdf', {
      type: 'application/pdf',
    })

    const parsed = await parseStatementPdf(file, file.name)

    expect(parsed.rows).toHaveLength(0)
    expect(parsed.warnings[0]).toContain('best-effort placeholder')
  })
})
