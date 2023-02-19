import { decodeArray, decodeDateString } from '../../common/codecs'

describe('decodeDateString', () => {
  it('basic positive', () => {
    expect(decodeDateString('2022-03-04')).toBe('2022-03-04')
  })
  it('not a string', () => {
    expect(() => decodeDateString(34)).toThrow()
  })
  it('does not match regex', () => {
    expect(() => decodeDateString('dummy string')).toThrow()
  })
})

describe('decodeArray', () => {
  it('basic positive', () => {
    expect(decodeArray(decodeDateString, ['2022-01-01', '2022-01-02'])).toEqual(
      ['2022-01-01', '2022-01-02']
    )
  })
  it('not an array', () => {
    expect(() => decodeArray(decodeDateString, 34)).toThrow()
  })
  it('some elements do not match', () => {
    expect(() => decodeArray(decodeDateString, ['2022-01-01', 34])).toThrow()
  })
})
