import { describe, expect, it } from 'vitest'
import { parseHistoricalSummaryCsv } from '../parsers/historicalSummary'
import { parseStatementCsv } from '../parsers/statementCsv'
import { parseStatementPdf } from '../parsers/statementPdf'

describe('historical summary parser', () => {
  it('preserves totals and infers the month from the filename', () => {
    const csv = [
      'Total,78,101.93,49.9,145.76,42.61,79.18,500,20.02,253.61,1271.01,,,0,0,0,0',
      'Category,Mobile,Dinners,Coffee,Groceries/Veggies,Household Items,Utilities,Rental,Travelling,Miscellaneous,,Total,,GIC,Parttime,Other,Total',
      ',78,94.03,6.76,21.37,3.96,70,500,4.57,70,Klarna,,,0,0,0,',
    ].join('\n')

    const parsed = parseHistoricalSummaryCsv(csv, 'Monthly_Expenditure - JAN 24.csv')

    expect(parsed.importMode).toBe('historical-summary')
    expect(parsed.statementMonth).toBe('2024-01')
    expect(parsed.snapshots.find((item) => item.categoryName === 'Coffee')?.amountCents).toBe(4990)
    expect(parsed.snapshots.find((item) => item.categoryName === 'GIC')?.section).toBe('income')
    expect(parsed.historicalEntries.find((item) => item.categoryName === 'Coffee')?.amountCents).toBe(676)
  })
})

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
