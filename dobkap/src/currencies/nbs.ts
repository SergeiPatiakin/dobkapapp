import got from 'got'
import { NaiveDate, CurrencyCode } from '../data-types'
import { XMLParser } from 'fast-xml-parser'

const nbsCurrencyCodeMapping: Map<string, CurrencyCode> = new Map([
  ['EUR', CurrencyCode.EUR],
  ['GBP', CurrencyCode.GBP],
  ['USD', CurrencyCode.USD],
  ['AED', CurrencyCode.AED],
  ['AUD', CurrencyCode.AUD],
  ['CAD', CurrencyCode.CAD],
  ['CHF', CurrencyCode.CHF],
  ['CZK', CurrencyCode.CZK],
  ['DKK', CurrencyCode.DKK],
  ['HUF', CurrencyCode.HUF],
  ['JPY', CurrencyCode.JPY],
  ['NOK', CurrencyCode.NOK],
  ['PLN', CurrencyCode.PLN],
  ['SEK', CurrencyCode.SEK],
  ['TRY', CurrencyCode.TRY],
])

export const nbsSupportedCurrencies = [...nbsCurrencyCodeMapping.values()]

export const nbsCurrencyService = async (day: NaiveDate, currencyCode: CurrencyCode) => {
  let url = `https://webappcenter.nbs.rs/WebApp/ExchangeRate/ExchangeRate?isSearchExecuted=true&Date=${day.format('DD.MM.YYYY')}&ExchangeRateListTypeID=3`
  const result = await got.get(url, {
    // headers: {
    //   Cookie: `JSESSIONID=${jsessionid}`
    // },
    // form,
  })


  const matches = result.body.match(new RegExp("/WebApp/ExchangeRate/ExchangeRate/Download\\?ExchangeRateListID=(?:[0-9a-f\\-]{36})&exchangeRateListTypeID=3&ExchangeRateListTypeName=srednjiKurs&Format=xml"))
  if (matches === null) {
    throw Error('NBS XML URL not found')
  }

  const url2 = 'https://webappcenter.nbs.rs' + matches[0]
  const result2 = await got.get(url2, {})

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })
  const document = parser.parse(result2.body)

  const nbsExchangeRates = document['Exchange_Rates_List']['item'].map((c: any) => ({
    nbsCurrencyCode: c['Currency'],
    scaleFactor: Number(c['Unit']),
    scaledExchangeRate: Number(c['Middle_Rate']),
  })) as Array<{
    nbsCurrencyCode: string,
    scaleFactor: number,
    scaledExchangeRate: number,
  }>

  const exchangeRates = nbsExchangeRates.map(
    ({nbsCurrencyCode, scaleFactor, scaledExchangeRate}) => ({
      currencyCode: nbsCurrencyCodeMapping.get(nbsCurrencyCode),
      exchangeRate: scaledExchangeRate / scaleFactor
    })
  ).filter(x => x.currencyCode)
  // TODO: cache entries in exchangeRates

  const exchangeRate = exchangeRates.find(x => x.currencyCode === currencyCode)!.exchangeRate

  return exchangeRate
}
