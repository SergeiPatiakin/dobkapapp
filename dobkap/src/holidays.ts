import { NaiveDate, UnsignedInteger } from "./data-types";
import { formatNaiveDate } from "./dates";

export interface HolidayService {
  workingDayAfter: (startDay: NaiveDate, offset: UnsignedInteger) => NaiveDate
}

export const createHolidayService = (holidays: NaiveDate[], holidayRange: {start: NaiveDate, end: NaiveDate}): HolidayService => {
  const holidaysSet = new Set(holidays.map(d => formatNaiveDate(d)))
  const isWorkingDay = (day: NaiveDate) => ![6, 7].includes(day.isoWeekday()) && !holidaysSet.has(formatNaiveDate(day))
  return {
    workingDayAfter: (startDay, offset) => {
      if (startDay.isBefore(holidayRange.start)){
        throw new Error('Holiday data coverage into the past is not sufficient')
      }
      let candidate = startDay.clone().add(offset, 'days')
      while (!isWorkingDay(candidate)) {
        candidate.add(1, 'day')
      }
      if (candidate.isAfter(holidayRange.end)){
        throw new Error('Holiday data coverage into the future is not sufficient')
      }
      return candidate
    }
  }
}
