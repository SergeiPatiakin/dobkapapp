/**
 * The trivial importer reads a PassiveIncomeInfo directly from a JSON file
 */
import { PassiveIncomeInfo } from '../passive-income';
import { toNaiveDate } from '../dates';
import { readFile } from '../tools';

export const trivialImporter = async (inputFile: string): Promise<PassiveIncomeInfo[]> => {
  const fileContents = await readFile(inputFile, 'utf8')
  const a = JSON.parse(fileContents)
  return [{...a, incomeDate: toNaiveDate(a.incomeDate)}]
}
