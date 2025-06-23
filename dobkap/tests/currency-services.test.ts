import { nbsCurrencyService } from '../src/currencies/nbs'
import { createCurrencyService } from '../src/currencies'
import { toNaiveDate } from '../src/dates'
import { CurrencyCode } from '../src/data-types'

describe('Currency services', () => {
  it('nbsCurrencyService end-to-end', async () => {
    const rate = await nbsCurrencyService(toNaiveDate('2020-07-16'), CurrencyCode.EUR)
    expect(rate).toBeCloseTo(117.595, 3)
  })
  it('createCurrencyService end-to-end for EUR', async () => {
    const currencyService = createCurrencyService({
      apiTokens: {
        mexicoBdmToken: '',
      },
      fallbackRates: [],
    })
    const rate = await currencyService(toNaiveDate('2020-07-16'), CurrencyCode.EUR)
    expect(rate).toBeCloseTo(117.595, 3)
  })
  it('createCurrencyService end-to-end for SGD', async () => {
    const currencyService = createCurrencyService({
      apiTokens: {
        mexicoBdmToken: '',
      },
      fallbackRates: [{
        currencyCode: CurrencyCode.SGD,
        dayString: '2020-07-16',
        currencyToBaseCurrencyRate: 0.72,
      }],
    })
    const rate = await currencyService(toNaiveDate('2020-07-16'), CurrencyCode.SGD)
    // NBS USD rate for is 103.0902
    // SGD rate should be calculated by multiplying the NBS USD rate by the IBKR fallback rate
    expect(rate).toBeCloseTo(103.0902 * 0.72, 3)
  })
  it('createCurrencyService end-to-end for MXN with fallback', async () => {
    const currencyService = createCurrencyService({
      apiTokens: {
        mexicoBdmToken: '',
      },
      fallbackRates: [{
        currencyCode: CurrencyCode.MXN,
        dayString: '2020-07-16',
        currencyToBaseCurrencyRate: 0.045,
      }],
    })
    const rate = await currencyService(toNaiveDate('2020-07-16'), CurrencyCode.MXN)
    // NBS USD rate for is 103.0902
    // MXN rate should be calculated by multiplying the NBS USD rate by the IBKR fallback rate
    expect(rate).toBeCloseTo(103.0902 * 0.045, 3)
  })
})
