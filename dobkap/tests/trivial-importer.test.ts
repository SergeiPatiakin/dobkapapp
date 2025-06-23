import path from 'path'
import { trivialImporter } from '../src/importers/trivial'
import { formatNaiveDate } from '../src/dates'

describe('trivialImporter', () => {
  it('basic', async () => {
    const r = (await trivialImporter(path.join(__dirname, 'data/trivial-dividend1.json')))
    expect(r).toMatchObject([
      {
        payingEntity: 'ABC',
        incomeCurrencyCode: 'EUR',
        incomeCurrencyAmount: 100,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 10,
      },
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2025-01-01')
  })
})
