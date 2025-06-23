import { Moment } from 'moment'
import * as t from 'io-ts'

export type Integer = number
export type UnsignedInteger = number

export type NaiveDate = Moment

export const DayStringCodec = t.string
export type DayString = t.TypeOf<typeof DayStringCodec>

export enum CurrencyCode {
  EUR = 'EUR',
  GBP = 'GBP',
  USD = 'USD',
  SGD = 'SGD',
  MXN = 'MXN',
  AED = 'AED',
  AUD = 'AUD',
  CAD = 'CAD',
  CHF = 'CHF',
  CZK = 'CZK',
  DKK = 'DKK',
  HUF = 'HUF',
  JPY = 'JPY',
  NOK = 'NOK',
  PLN = 'PLN',
  SEK = 'SEK',
  TRY = 'TRY',
}
