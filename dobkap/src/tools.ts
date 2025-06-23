import * as E from 'fp-ts/lib/Either'
import { promisify } from 'util'
import fs from 'fs'

export const fromThrowable = <T>(f: () => T): E.Either<any, T> => {
  try {
    const result = f()
    return E.right(result)
  } catch (e) {
    return E.left(e)
  }
}

export const readFile = promisify(fs.readFile)
