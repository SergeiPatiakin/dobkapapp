import { Argv } from 'yargs'
import * as O from 'fp-ts/lib/Option'
import * as E from 'fp-ts/lib/Either'
import { getConf } from './conf'
import { PassiveIncomeInfo, getPassiveIncomeFilingInfo, PassiveIncomeFilingInfo } from './passive-income'
import { trivialImporter } from './importers/trivial'
import { createCurrencyService } from './currencies'
import { toNaiveDate } from './dates'
import { pipe } from 'fp-ts/lib/pipeable'
import { identity } from 'fp-ts/lib/function'
import { OpoData, getFilingDeadline, fillOpoForm } from './eporezi'
import { createHolidayService } from './holidays'
import fs from 'fs'
import path from 'path'
import { ibkrImporter } from './importers/ibkr'
const yargs = require('yargs')

// DobKapProcessArgs is the data structure we receive from yargs
interface DobKapImportArgs {
  input: string
  importer?: string
  output?: string
  conf?: string
}

interface DobKapNormalizedImportArgs {
  inputFilePath: string
  importer: string
  outputDirPath: string
  confFilePath: O.Option<string>
}

const processImport = async (args: DobKapImportArgs) => {
  const normArgs: DobKapNormalizedImportArgs = {
    inputFilePath: args.input,
    importer: args.importer || 'trivial',
    outputDirPath: args.output || process.cwd(),
    confFilePath: O.fromNullable(args.conf),
  }
  const conf = pipe(
    getConf(normArgs.confFilePath),
    E.fold(e => {throw new Error(e.join('; '))}, identity)
  )
  
  let passiveIncomeInfos: PassiveIncomeInfo[]
  if (normArgs.importer === 'trivial'){
    passiveIncomeInfos = await trivialImporter(normArgs.inputFilePath)
  } else if (normArgs.importer === 'ibkr'){
    passiveIncomeInfos = (await ibkrImporter(normArgs.inputFilePath)).passiveIncomeInfos
  } else {
    throw new Error('Unknown importer')
  }

  const apiTokens = {mexicoBdmToken: conf.mexicoBdmToken}
  const currencyService = createCurrencyService({ apiTokens })

  for (const [idx, passiveIncomeInfo] of passiveIncomeInfos.entries()){
    const passiveIncomeFilingInfo = await getPassiveIncomeFilingInfo(
      currencyService,
      passiveIncomeInfo
    )
    
    const holidays = conf.holidays.map(h => toNaiveDate(h))
    const holidayRange = {
      start: toNaiveDate(conf.holidayRangeStart),
      end: toNaiveDate(conf.holidayRangeEnd),
    }
    const holidayService = createHolidayService(holidays, holidayRange)

    const filingDeadline = getFilingDeadline(holidayService, passiveIncomeFilingInfo.incomeDate)

    const opoData: OpoData = {
      jmbg: conf.jmbg,
      fullName: conf.fullName,
      streetAddress: conf.streetAddress,
      filerJmbg: conf.jmbg,
      phoneNumber: conf.phoneNumber,
      opstinaCode: conf.opstinaCode,
      email: conf.email,
      realizationMethod: conf.realizationMethod,
      filingDeadline,
      passiveIncomeFilingInfo: passiveIncomeFilingInfo,
    }
    const opoForm = fillOpoForm(opoData)
    const inputFileName = path.parse(normArgs.inputFilePath).name
    const outputFileName = inputFileName + (passiveIncomeInfos.length > 1 ? `.out.${idx + 1}.xml` : '.out.xml')
    const outputFilePath = path.join(normArgs.outputDirPath, outputFileName)
    fs.writeFileSync(outputFilePath, opoForm)
  }
}

interface DobKapCheckRateArgs {
  day: string
  currency: string
  conf?: string
}

const processCheckRate = async (args: DobKapCheckRateArgs) => {
  const conf = pipe(
    getConf(O.fromNullable(args.conf)),
    E.fold(e => {throw new Error(e.join('; '))}, identity)
  )
  const apiTokens = {
    mexicoBdmToken: conf.mexicoBdmToken
  }
  const currencyService = createCurrencyService({ apiTokens })
  const rate = await currencyService(toNaiveDate(args.day), args.currency as any)
  console.info(rate)
}

yargs.scriptName('dobkap')
  .command('import', 'Import passive income files', (yargs: Argv) => {
    yargs.option('input', {
      describe: 'Path to input file',
      alias: 'i',
    })
    .option('importer', {
      describe: 'Importer',
      alias: 'm'
    })
    .option('output', {
      describe: 'Path to output file',
      alias: 'o'
    })
    .option('conf', {
      describe: 'Path to conf file',
      alias: 'c'
    })
    .demandOption(['input'])
  }, (args: any) => {
    processImport(args)
  })
  .command('checkrate', 'Check exchange rate', (yargs: Argv) => {
    yargs.option('day', {
      describe: 'Day in YYYY-MM-DD format',
      alias: 'd',
    })
    .option('conf', {
      describe: 'Path to conf file',
      alias: 'c'
    })
    .option('currency', {
      describe: 'Currency code',
      alias: 'k'
    })
    .demandOption(['day', 'currency'])
  }, (args: any) => {
    processCheckRate(args)
  })
  .strict()
  .argv
