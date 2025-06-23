import path from 'path'
import { formatNaiveDate } from '../src/dates'
import { ibkrImporter } from '../src/importers/ibkr'

describe('ibkrImporter', () => {
  it('basic - full report', async () => {
    const r = (await ibkrImporter(path.join(__dirname, 'data/ibkr-full1.csv'))).passiveIncomeInfos
    expect(r).toMatchObject([
      {
        incomeCurrencyCode: 'EUR',
        payingEntity: 'ABC',
        incomeCurrencyAmount: 60,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 6
      },
      {
        type: 'interest',
        incomeCurrencyCode: 'EUR',
        payingEntity: 'Interactive Brokers',
        incomeCurrencyAmount: 12.34,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 0,
      },
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2023-01-12')
  })
  it('basic - dividends section', async () => {
    const r = (await ibkrImporter(path.join(__dirname, 'data/ibkr-dividend1.csv'))).passiveIncomeInfos
    expect(r).toMatchObject([
      {
        incomeCurrencyCode: 'EUR',
        payingEntity: 'ABC',
        incomeCurrencyAmount: 60,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 6
      }
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2023-01-12')
  })
  it('basic - multiple dividends', async () => {
    const r = (await ibkrImporter(path.join(__dirname, 'data/ibkr-dividend2.csv'))).passiveIncomeInfos
    expect(r).toMatchObject([
      // One dividend from ABC in EUR
      {
        incomeCurrencyCode: 'EUR',
        payingEntity: 'ABC',
        incomeCurrencyAmount: 60,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 0,
      },
      // One dividend from DEF1 in GBP
      {
        incomeCurrencyCode: 'GBP',
        payingEntity: 'DEF1',
        incomeCurrencyAmount: 70,
        whtCurrencyCode: 'GBP',
        whtCurrencyAmount: 0,
      },
      // Two dividends from DEF2 in GBP, merged together
      {
        incomeCurrencyCode: 'GBP',
        payingEntity: 'DEF2',
        incomeCurrencyAmount: 143, // Sum of amounts: 71 + 72
        whtCurrencyCode: 'GBP',
        whtCurrencyAmount: 0,
      },
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2023-01-12')
    expect(formatNaiveDate(r[1].incomeDate)).toBe('2023-01-12')
    expect(formatNaiveDate(r[2].incomeDate)).toBe('2023-01-12')
  })
  it('interest income', async () => {
    const r = (await ibkrImporter(path.join(__dirname, 'data/ibkr-interest1.csv'))).passiveIncomeInfos
    expect(r).toMatchObject([
      {
        type: 'interest',
        incomeCurrencyCode: 'EUR',
        payingEntity: 'Interactive Brokers',
        incomeCurrencyAmount: 12.34,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 0,
      },
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2023-02-03')
  })
  it('debit interest deducted from credit interest in same currency', async () => {
    const r = (await ibkrImporter(path.join(__dirname, 'data/ibkr-interest2.csv'))).passiveIncomeInfos
    expect(r).toMatchObject([
      {
        type: 'interest',
        incomeCurrencyCode: 'EUR',
        payingEntity: 'Interactive Brokers',
        incomeCurrencyAmount: 10.00,
        whtCurrencyCode: 'EUR',
        whtCurrencyAmount: 0,
      },
    ])
    expect(formatNaiveDate(r[0].incomeDate)).toBe('2023-01-05')
  })
})
