import { NaiveDate, CurrencyCode } from "./data-types";
import { CurrencyService } from "./currencies";
import * as Rsd from "./rsd-amount";
import { RsdAmount } from "./rsd-amount";

export const PASSIVE_INCOME_TAX_RATE = 0.15

export type PassiveIncomeType = 'dividend' | 'interest'
export interface PassiveIncomeInfo {
  type: PassiveIncomeType
  payingEntity: string
  incomeDate: NaiveDate
  incomeCurrencyCode: CurrencyCode
  incomeCurrencyAmount: number
  whtCurrencyCode: CurrencyCode
  whtCurrencyAmount: number
}

export interface PassiveIncomeFilingInfo {
  type: PassiveIncomeType
  payingEntity: string
  incomeDate: NaiveDate
  grossIncome: RsdAmount
  taxPaidAbroad: RsdAmount
  grossTaxPayable: RsdAmount
  taxPayable: RsdAmount
}

export const getPassiveIncomeFilingInfo = async (
  currencyService: CurrencyService,
  passiveIncomeInfo: PassiveIncomeInfo,
): Promise<PassiveIncomeFilingInfo> => {
  const {
    type,
    payingEntity,
    incomeDate,
    incomeCurrencyCode,
    incomeCurrencyAmount,
    whtCurrencyCode,
    whtCurrencyAmount,
  } = passiveIncomeInfo
  
  const dividendExchangeRate = await currencyService(incomeDate, incomeCurrencyCode)
  const grossIncome = Rsd.fromCurrency(dividendExchangeRate, incomeCurrencyAmount)
  
  const whtExchangeRate = await currencyService(incomeDate, whtCurrencyCode)
  const taxPaidAbroad = Rsd.fromCurrency(whtExchangeRate, whtCurrencyAmount)
  
  const grossTaxPayable = Rsd.multiply(PASSIVE_INCOME_TAX_RATE)(grossIncome)
  const taxPayable = Rsd.map2((grossPayable, paidAbroad) => paidAbroad > grossPayable
    ? BigInt(0)
    : grossPayable - paidAbroad)(grossTaxPayable, taxPaidAbroad)
  return {
    type,
    payingEntity,
    incomeDate,
    grossIncome,
    taxPaidAbroad,
    grossTaxPayable,
    taxPayable,
  }
}
