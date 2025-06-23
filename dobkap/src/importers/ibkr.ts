import csv from 'csv-parser'
import fs from 'fs'
import { PassiveIncomeInfo } from '../passive-income'
import { CurrencyCode, NaiveDate } from '../data-types'
import { toNaiveDate, formatNaiveDate } from '../dates'
import { ExchangeRateInfo } from '../currencies/index'
import moment from 'moment'

const parseCsvFile = async (filePath: string): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const results: string[][] = []
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false}))
      .on('data', x => {
        results.push(x)
      })
      .on('end', () => {
        resolve(results)
      })
  })
}

const ENTITY_NAME_REGEX = /^([0-9A-Za-z\.]+)\s*\(([0-9A-Za-z]+)\)/

const toDividendKey = (date: NaiveDate, entityName: string, entityIsin: string) => `${formatNaiveDate(date)}:${entityName}:${entityIsin}`
const isDividendSectionRow = (row: string[]) => row[0] === 'Dividends' && row[1] === 'Data'
const isDividendRow = (row: string[]) => row[0] === 'Dividends' && row[1] === 'Data' && !row[2].startsWith('Total')

const getDividendIncomes = (csvCells: string[][]): PassiveIncomeInfo[] => {
  const dividendSectionStartIndex = csvCells.findIndex(x =>
    x[0] === 'Dividends'
    && x[1] === 'Header'
    && x[2] === 'Currency'
    && x[3] === 'Date'
    && x[4] === 'Description'
    && x[5] === 'Amount'
  )

  const dividendInfosMap: Map<string, PassiveIncomeInfo> = new Map()
  if (dividendSectionStartIndex !== -1){
    for(
      let dividendRowIndex = dividendSectionStartIndex + 1;
      isDividendSectionRow(csvCells[dividendRowIndex]);
      dividendRowIndex++
    ){
      if (!isDividendRow(csvCells[dividendRowIndex])) {
        continue
      }
      const row = csvCells[dividendRowIndex]
      const dividendCurrencyCode: CurrencyCode = row[2] as CurrencyCode
      const paymentDate: NaiveDate = toNaiveDate(row[3]) // TODO: decode to day string first?
      const parsedEntityName = row[4].match(ENTITY_NAME_REGEX)
      if (!parsedEntityName) {
        throw new Error(`Could not parse entity name for dividend entry: ${row[4]}`)
      }
      const payingEntity = parsedEntityName[1]
      const payingEntityIsin = parsedEntityName[2]
      const dividendCurrencyAmount = parseFloat(row[5])
      const dividendInfo: PassiveIncomeInfo = {
        type: 'dividend',
        incomeCurrencyCode: dividendCurrencyCode,
        incomeDate: paymentDate,
        payingEntity,
        incomeCurrencyAmount: dividendCurrencyAmount,
        whtCurrencyCode: dividendCurrencyCode, // Default value, may be overwritten
        whtCurrencyAmount: 0, // Default value, may be overwritten
      }
      const dividendInfoKey = toDividendKey(paymentDate, payingEntity, payingEntityIsin)
      if (dividendInfosMap.has(dividendInfoKey)){
        const existingDividendInfo = dividendInfosMap.get(dividendInfoKey)!
        if (existingDividendInfo.incomeCurrencyCode !== dividendInfo.incomeCurrencyCode){
          throw new Error('Duplicate dividends found with different currencies')
        }
        existingDividendInfo.incomeCurrencyAmount += dividendInfo.incomeCurrencyAmount
        if (existingDividendInfo.whtCurrencyCode !== dividendInfo.whtCurrencyCode){
          throw new Error('Duplicate dividends found with different withholding tax currencies')
        }
      } else {
        dividendInfosMap.set(dividendInfoKey, dividendInfo)
      }
    }

    const whtSectionStartIndex = csvCells.findIndex(x => 
      x[0] === 'Withholding Tax'
      && x[1] === 'Header'
      && x[2] === 'Currency'
      && x[3] === 'Date'
      && x[4] === 'Description'
      && x[5] === 'Amount'
      && x[6] === 'Code'
    )
    
    if (whtSectionStartIndex !== -1){
      const isWhtSectionRow = (row: string[]) => row[0] === 'Withholding Tax'
      const isWhtRow = (row: string[]) => row[0] === 'Withholding Tax' && row[1] === 'Data' && !row[2].startsWith('Total')
      for (let whtRowIndex = whtSectionStartIndex + 1; isWhtSectionRow(csvCells[whtRowIndex]); whtRowIndex++){
        if (!isWhtRow(csvCells[whtRowIndex])){
          continue
        }
        const row = csvCells[whtRowIndex]
        const whtCurrencyCode: CurrencyCode = row[2] as CurrencyCode
        const paymentDate: NaiveDate = toNaiveDate(row[3])
        const parsedEntityName = row[4].match(ENTITY_NAME_REGEX)
        if (!parsedEntityName) {
          throw new Error(`Could not parse entity name for WHT entry: ${row[4]}`)
        }
        const payingEntity = parsedEntityName[1]
        const payingEntityIsin = parsedEntityName[2]
        const whtCurrencyAmount = -parseFloat(row[5])
        
        const dividendKey = toDividendKey(paymentDate, payingEntity, payingEntityIsin)
        const dividendInfo = dividendInfosMap.get(dividendKey)
        if (!dividendInfo){
          throw new Error('Cannot match WHT payment to dividend payment')
        } else if (dividendInfo.whtCurrencyAmount === 0) {
          // First WHT payment for this dividend
          dividendInfo.whtCurrencyCode = whtCurrencyCode
          dividendInfo.whtCurrencyAmount = whtCurrencyAmount
        } else {
          // Second or subsequent WHT payment for this dividend
          if (dividendInfo.whtCurrencyCode !== whtCurrencyCode) {
            throw new Error('Two WHT payments for the same dividend payment have different currencies')
          }
          dividendInfo.whtCurrencyAmount += whtCurrencyAmount
       }
      }
    }
  }
  return [...dividendInfosMap.values()]
}

const toInterestKey = (date: NaiveDate, currencyCode: string) => `${formatNaiveDate(date)}:${currencyCode}`
const isInterestSectionRow = (row: string[]) => row[0] === 'Interest' && row[1] === 'Data'
const isInterestRow = (row: string[]) => row[0] === 'Interest' && row[1] === 'Data' && !row[2].startsWith('Total')

export const getInterestIncomes = (csvCells: string[][]) => {
  const interestSectionStartIndex = csvCells.findIndex(x =>
    x[0] === 'Interest'
    && x[1] === 'Header'
    && x[2] === 'Currency'
    && x[3] === 'Date'
    && x[4] === 'Description'
    && x[5] === 'Amount'
  )
  const interestInfosMap: Map<string, PassiveIncomeInfo> = new Map()
  for(
    let interestRowIndex = interestSectionStartIndex + 1;
    isInterestSectionRow(csvCells[interestRowIndex]);
    interestRowIndex++
  ){
    if (!isInterestRow(csvCells[interestRowIndex])) {
      continue
    }
    const row = csvCells[interestRowIndex]
    const interestCurrencyCode: CurrencyCode = row[2] as CurrencyCode
    const paymentDate: NaiveDate = toNaiveDate(row[3]) // TODO: decode to day string first?
    if (!(
      row[4].startsWith(`${interestCurrencyCode} Credit Interest for `) ||
      row[4].startsWith(`${interestCurrencyCode} Debit Interest for `)
    )) {
      continue
    }
    const payingEntity = 'Interactive Brokers'
    const interestCurrencyAmount = parseFloat(row[5])
    const interestKey = toInterestKey(paymentDate, interestCurrencyCode)
    const interestInfo = interestInfosMap.get(interestKey) ?? {
      type: 'interest',
      incomeCurrencyCode: interestCurrencyCode, // Initial value, will be overwritten
      incomeDate: paymentDate,
      payingEntity,
      incomeCurrencyAmount: 0,
      whtCurrencyCode: interestCurrencyCode,
      whtCurrencyAmount: 0, // No withholding tax on IBKR interest for Serbian residents      
    }
    interestInfo.incomeCurrencyAmount += interestCurrencyAmount
    interestInfosMap.set(interestKey, interestInfo)
  }
  return [...interestInfosMap.values()].filter(ii => ii.incomeCurrencyAmount > 0)
}

const isExchangeRateSectionRow = (row: string[]) => row[0] === 'Base Currency Exchange Rate' && row[1] === 'Data'

export const getExchangeRateInfos = (csvCells: string[][]): ExchangeRateInfo[] => {
  const statementPeriodRow = csvCells.find(x =>
    x[0] === 'Statement' &&
    x[1] === 'Data' &&
    x[2] === 'Period'
  )
  if (statementPeriodRow === undefined) {
    throw new Error('Cannot find statement period')
  }
  const statementDay: string = moment(statementPeriodRow[3], "MMMM D, YYYY").format('YYYY-MM-DD')

  const exchangeRateSectionStartIndex = csvCells.findIndex(x =>
    x[0] === 'Base Currency Exchange Rate'
    && x[1] === 'Header'
    && x[2] === 'Currency'
    && x[3] === 'Rate'
  )
  const exchangeRateInfos: Array<ExchangeRateInfo> = []
  for (
    let exchangeRateRowIndex = exchangeRateSectionStartIndex + 1;
    isExchangeRateSectionRow(csvCells[exchangeRateRowIndex]);
    exchangeRateRowIndex++
  ) {
    const row = csvCells[exchangeRateRowIndex]
    exchangeRateInfos.push({
      currencyCode: row[2] as CurrencyCode,
      dayString: statementDay,
      currencyToBaseCurrencyRate: Number(row[3]),
    })
  }
  return exchangeRateInfos
}

export const ibkrImporter = async (inputFile: string): Promise<{
  passiveIncomeInfos: PassiveIncomeInfo[],
  exchangeRateInfos: ExchangeRateInfo[],
}> => {
  const csvCells = await parseCsvFile(inputFile)
  const dividendIncomes = getDividendIncomes(csvCells)
  const interestIncomes = getInterestIncomes(csvCells)
  const exchangeRateInfos = getExchangeRateInfos(csvCells)
  return {
    passiveIncomeInfos: [...dividendIncomes, ...interestIncomes],
    exchangeRateInfos,
  }
}
