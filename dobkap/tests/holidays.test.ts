import { toNaiveDate, formatNaiveDate } from "../src/dates"
import { createHolidayService } from "../src/holidays"

describe('workingDayAfter', () => {
  const holidays = [
    toNaiveDate('2020-07-27'),
    toNaiveDate('2020-07-28'),
  ]
  const holidayRange = {
    start: toNaiveDate('2020-01-01'),
    end: toNaiveDate('2020-12-31'),
  }
  it('weekday, no adjustment needed', () => {
    expect(formatNaiveDate(createHolidayService(holidays, holidayRange).workingDayAfter(toNaiveDate('2020-07-06'), 7))).toBe('2020-07-13')
  })
  it('weekend adjustment', () => {
    expect(formatNaiveDate(createHolidayService(holidays, holidayRange).workingDayAfter(toNaiveDate('2020-07-05'), 7))).toBe('2020-07-13')
  })
  it('weekend and holiday adjustment', () => {
    expect(formatNaiveDate(createHolidayService(holidays, holidayRange).workingDayAfter(toNaiveDate('2020-07-19'), 7))).toBe('2020-07-29')
  })
  it('negative: past bound', () => {
    expect(() => createHolidayService(holidays, holidayRange).workingDayAfter(toNaiveDate('2019-07-19'), 7)).toThrow()
  })
  it('negative: future bound', () => {
    expect(() => createHolidayService(holidays, holidayRange).workingDayAfter(toNaiveDate('2020-12-25'), 7)).toThrow()
  })
})
