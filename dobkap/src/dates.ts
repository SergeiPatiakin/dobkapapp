import { NaiveDate, DayString } from "./data-types";
import moment from 'moment-timezone'

export const toNaiveDate = (dayString: DayString): NaiveDate => moment.tz(dayString, 'UTC')
export const formatNaiveDate = (date: NaiveDate) => date.format('YYYY-MM-DD')
