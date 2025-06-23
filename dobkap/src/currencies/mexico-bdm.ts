import got from 'got'
import { NaiveDate, CurrencyCode } from "../data-types"
import * as assert from 'assert'

export const mexicoBdmCurrencyService = async (token: string, day: NaiveDate, currencyCode: CurrencyCode) => {
  const result = await got.get(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/${day.format('YYYY-MM-DD')}/${day.format('YYYY-MM-DD')}`, {
    headers: {
      'Bmx-Token': token,
      'Accept': 'application/json',
    }
  })
  const resultBody = JSON.parse(result.body)
  assert.equal(currencyCode, CurrencyCode.USD)
  assert.equal(resultBody.bmx.series[0].datos.length, 1)
  return parseFloat(resultBody.bmx.series[0].datos[0].dato)
}
