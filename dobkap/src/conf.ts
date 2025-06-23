import * as t from 'io-ts'
import * as O from 'fp-ts/lib/Option'
import * as E from 'fp-ts/lib/Either'
import { DayStringCodec } from './data-types'
import { pipe, flow } from 'fp-ts/lib/function'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { failure as reportFailure } from 'io-ts/lib/PathReporter'

export const ConfCodec = t.intersection([
  t.type({
    jmbg: t.string,
    fullName: t.string, // TODO: cyrillic?
    streetAddress: t.string,
    phoneNumber: t.string, // TODO: regex validation?
    email: t.string,
    opstinaCode: t.string,
    realizationMethod: t.string,
    holidayRangeStart: DayStringCodec,
    holidayRangeEnd: DayStringCodec,
    holidays: t.array(DayStringCodec),
  }),
  t.partial({
    mexicoBdmToken: t.string,
  })
])
export type Conf = t.TypeOf<typeof ConfCodec>

/**
 * Tries a sequence of file names
 */
export const getConf = (confFilePath: O.Option<string>): E.Either<string[], Conf> => {
  const tryPath = (path: string) => fs.existsSync(path) ? O.some(fs.readFileSync(path, {encoding: 'utf8'})): O.none
  return pipe(
    O.chain(tryPath)(confFilePath),
    O.alt(() => tryPath('dobkap.conf')),
    O.alt(() => tryPath(path.join(os.homedir(), 'dobkap.conf'))),
    E.fromOption(() => ['Cannot find conf file']),
    E.chain(fileContents => E.parseJSON(fileContents, (e: any) => ['Failed to parse configuration JSON', e.toString()])),
    E.chain(flow(ConfCodec.decode, E.mapLeft(x => ['Invalid configuration'].concat(reportFailure(x))))),
  )
}
