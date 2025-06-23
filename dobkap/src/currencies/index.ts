import { NaiveDate, CurrencyCode, DayString } from "../data-types"
import { nbsCurrencyService } from "./nbs"
import { formatNaiveDate } from "../dates"
import { mexicoBdmCurrencyService } from "./mexico-bdm"

interface ApiTokens {
  mexicoBdmToken: string
}

export type ExchangeRateInfo = {
  dayString: DayString
  currencyCode: CurrencyCode
  currencyToBaseCurrencyRate: number
}

interface AsyncCache {
  has: (key: string) => Promise<boolean>
  get: (key: string) => Promise<any>
  set: (key: string, value: any) => Promise<void>
}

export const createCurrencyService = (args: { apiTokens?: Partial<ApiTokens>, cache?: AsyncCache, fallbackRates?: Array<ExchangeRateInfo> }) => async (day: NaiveDate, currencyCode: CurrencyCode): Promise<number> => {
  const { cache } = args
  const apiTokens: Partial<ApiTokens> = args.apiTokens ?? {}
  const ibkrRates: Array<ExchangeRateInfo> = args.fallbackRates ?? []
  const cacheKey = `${formatNaiveDate(day)}-${currencyCode}`
  if (cache && await cache.has(cacheKey)){
    const { value } = await cache.get(cacheKey)
    return value
  } else {
    let value
    if (currencyCode === CurrencyCode.SGD) {
      // Use USD as an intermediate currency to fallback rates

      // Find rate from SGD to base currency
      let sgdBaseCurrency: number
      const sgdBaseCurrencyInfo = ibkrRates.find(eri =>
        eri.dayString === formatNaiveDate(day) &&
        eri.currencyCode === CurrencyCode.SGD
      )
      if (sgdBaseCurrencyInfo === undefined) {
        // Cannot find an entry for converting base currency to SGD. This must mean SGD is the base
        // currency!
        sgdBaseCurrency = 1
      } else {
        sgdBaseCurrency = sgdBaseCurrencyInfo.currencyToBaseCurrencyRate
      }

      // Find rate from USD to base currency
      let usdBaseCurrency: number
      const usdBaseCurrencyInfo = ibkrRates.find(eri =>
        eri.dayString === formatNaiveDate(day) &&
        eri.currencyCode === CurrencyCode.USD
      )
      if (usdBaseCurrencyInfo === undefined) {
        // Cannot find an entry for converting base currency to USD. This must mean USD is the base
        // currency!
        usdBaseCurrency = 1
      } else {
        usdBaseCurrency = usdBaseCurrencyInfo.currencyToBaseCurrencyRate
      }

      const usdSgd = usdBaseCurrency / sgdBaseCurrency

      const usdRsd = await createCurrencyService({ apiTokens })(day, CurrencyCode.USD)
      value = usdRsd / usdSgd
    } else if (currencyCode === CurrencyCode.MXN) {
      // Use USD as an intermediate currency

      let usdMxn: number
      if (apiTokens.mexicoBdmToken) {
        usdMxn = await mexicoBdmCurrencyService(apiTokens.mexicoBdmToken, day, CurrencyCode.USD)
      } else {
        // Find rate from MXN to base currency
        let mxnBaseCurrency: number
        const mxnBaseCurrencyInfo = ibkrRates.find(eri =>
          eri.dayString === formatNaiveDate(day) &&
          eri.currencyCode === CurrencyCode.MXN
        )
        if (mxnBaseCurrencyInfo === undefined) {
          // Cannot find an entry for converting base currency to MXN. This must mean MXN is the base
          // currency!
          mxnBaseCurrency = 1
        } else {
          mxnBaseCurrency = mxnBaseCurrencyInfo.currencyToBaseCurrencyRate
        }

        // Find rate from MXN to base currency
        let usdBaseCurrency: number
        const usdBaseCurrencyInfo = ibkrRates.find(eri =>
          eri.dayString === formatNaiveDate(day) &&
          eri.currencyCode === CurrencyCode.USD
        )
        if (usdBaseCurrencyInfo === undefined) {
          // Cannot find an entry for converting base currency to USD. This must mean USD is the base
          // currency!
          usdBaseCurrency = 1
        } else {
          usdBaseCurrency = usdBaseCurrencyInfo.currencyToBaseCurrencyRate
        }

        usdMxn = usdBaseCurrency / mxnBaseCurrency
      }

      const usdRsd = await createCurrencyService({ apiTokens })(day, CurrencyCode.USD)
      value = usdRsd / usdMxn
    } else {
      value = await nbsCurrencyService(day, currencyCode)
    }
    if (cache) {
      await cache.set(cacheKey, value)
    }
    return value
  }
}

export type CurrencyService = (day: NaiveDate, currencyCode: CurrencyCode) => Promise<number>
