import { formatRsdAmount } from "../src/rsd-amount"

describe('formatRsdAmount', () => {
  it('four digits', () => {
    expect(formatRsdAmount({cents: BigInt(1234)})).toBe('12.34')
  })
  it('three digits', () => {
    expect(formatRsdAmount({cents: BigInt(123)})).toBe('1.23')
  })
  it('two digits', () => {
    expect(formatRsdAmount({cents: BigInt(12)})).toBe('0.12')
  })
  it('one digit', () => {
    expect(formatRsdAmount({cents: BigInt(1)})).toBe('0.01')
  })
  it('zero', () => {
    expect(formatRsdAmount({cents: BigInt(0)})).toBe('0.00')
  })
  it('four digits, negative', () => {
    expect(formatRsdAmount({cents: BigInt(-1234)})).toBe('-12.34')
  })
})
