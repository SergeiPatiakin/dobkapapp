import { DateString } from './primitive-types'

export type Decoder<T> = (input: any) => T

export const decodeDateString: Decoder<DateString> = input => {
  if (typeof input !== 'string') {
    throw new Error(`Expected string, received ${input}`)
  }
  if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(input)) {
    throw new Error(`Expected date regex, received ${input}`)
  }
  return input
}

export const decodeArray = <T>(decodeItem: Decoder<T>, input: any): Array<T> => {
  if (!Array.isArray(input)) {
    throw new Error('Not an array')
  }
  const result: Array<T> = []
  for (const inputItem of input) {
    result.push(decodeItem(inputItem))
  }
  return result
}
