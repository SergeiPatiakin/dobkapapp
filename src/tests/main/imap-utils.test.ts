import { getSearchCriteria } from '../../main/imap-utils'

describe('getSearchCriteria', () => {
  it('date cursor', () => {
    expect(getSearchCriteria({
      fromFilter: 'abc',
      subjectFilter: 'def',
      cursor: {
        type: 'date',
        dateString: '2022-02-24',
      }
    })).toEqual([
      [ 'FROM', 'abc' ],
      [ 'SUBJECT', 'def' ],
      [ 'SINCE', '2022-02-24' ],
    ])
  })
  it('UID cursor', () => {
    expect(getSearchCriteria({
      fromFilter: 'abc',
      subjectFilter: 'def',
      cursor: {
        type: 'uid',
        lastSeenDatetime: 1600000000,
        lastSeenUid: 101,
      },
    })).toEqual([
      [ 'FROM', 'abc' ],
      [ 'SUBJECT', 'def' ],
      [ 'UID', '102:*' ],
    ])
  })
})
