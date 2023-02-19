import { decodeHolidayConf } from '../../common/holiday-conf'

describe('decodeHolidayConf', () => {
  it('basic positive', () => {
    expect(decodeHolidayConf({
      holidayRangeStart: '2022-01-01',
      holidayRangeEnd: '2023-01-01',
      holidays: ['2022-01-01', '2022-01-02'],
    })).toEqual({
      holidayRangeStart: '2022-01-01',
      holidayRangeEnd: '2023-01-01',
      holidays: ['2022-01-01', '2022-01-02'],
    })
  })
})
