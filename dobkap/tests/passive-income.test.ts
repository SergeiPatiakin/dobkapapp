import { getPassiveIncomeFilingInfo } from '../src/passive-income'
import moment from 'moment'
import { CurrencyService } from '../src/currencies'
import { CurrencyCode } from '../src/data-types'

const mockCurrencyServiceRepo: CurrencyService = async () => 120

describe('getPassiveIncomeFilingInfo', () => {
  it('some tax payable', async () => {
    const mockDate = moment()
    const result = await getPassiveIncomeFilingInfo(
      mockCurrencyServiceRepo,
      {
        type: 'dividend',
        payingEntity: 'BMW',
        incomeDate: mockDate,
        incomeCurrencyCode: CurrencyCode.EUR,
        incomeCurrencyAmount: 200.0,
        whtCurrencyCode: CurrencyCode.EUR,
        whtCurrencyAmount: 20.0,
      }
    )
    expect(result).toEqual({
      type: 'dividend',
      payingEntity: 'BMW',
      incomeDate: mockDate,
      grossIncome: {cents: BigInt(120 * 200 * 100)},
      grossTaxPayable: {cents: BigInt(120 * 30 * 100)},
      taxPaidAbroad: {cents: BigInt(120 * 20 * 100)},
      taxPayable: {cents: BigInt(120 * 10 * 100)},
    })
  })
  it('no tax payable', async () => {
    const mockDate = moment()
    const result = await getPassiveIncomeFilingInfo(
      mockCurrencyServiceRepo,
      {
        type: 'dividend',
        payingEntity: 'BMW',
        incomeDate: mockDate,
        incomeCurrencyCode: CurrencyCode.EUR,
        incomeCurrencyAmount: 200.0,
        whtCurrencyCode: CurrencyCode.EUR,
        whtCurrencyAmount: 52.0,
      }
    )
    expect(result).toEqual({
      type: 'dividend',
      payingEntity: 'BMW',
      incomeDate: mockDate,
      grossIncome: {cents: BigInt(120 * 200 * 100)},
      grossTaxPayable: {cents: BigInt(120 * 200 * 100 * 0.15)},
      taxPaidAbroad: {cents: BigInt(120 * 52 * 100)},
      taxPayable: {cents: BigInt(0)},
    })
  })
})
