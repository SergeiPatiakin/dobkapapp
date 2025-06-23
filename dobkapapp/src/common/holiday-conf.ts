import { decodeArray, decodeDateString, Decoder } from './codecs'
import { DateString } from './primitive-types'

export type HolidayConf = {
  holidayRangeStart: DateString
  holidayRangeEnd: DateString
  holidays: DateString[]
}

export const decodeHolidayConf: Decoder<HolidayConf> = input => {
  if (typeof input !== 'object') {
    throw new Error('Not an object')
  }
  return {
    holidayRangeStart: decodeDateString(input.holidayRangeStart),
    holidayRangeEnd: decodeDateString(input.holidayRangeEnd),
    holidays: decodeArray(decodeDateString, input.holidays),
  }
}
