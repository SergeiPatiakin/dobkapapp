import { fillOpoForm } from '../src/eporezi'
import { toNaiveDate } from '../src/dates'
import { fromCurrency } from '../src/rsd-amount'
import fs from 'fs'
import path from 'path'

describe('fillOpoForm', () => {
  it('basic', () => {
    const result = fillOpoForm({
      fullName: 'Jован Jовановић',
      streetAddress: 'Terazije 1/1',
      phoneNumber: '0611111111',
      email: 'jovan@example.com',
      opstinaCode: '016',
      jmbg: '1234567890123',
      filerJmbg: '1234567890123',
      realizationMethod: 'Isplata na brokerski racun',
      filingDeadline: toNaiveDate('2020-08-16'),
      passiveIncomeFilingInfo: {
        type: 'dividend',
        payingEntity: 'BMW',
        grossIncome: fromCurrency(117, 100),
        grossTaxPayable: fromCurrency(117, 15),
        taxPaidAbroad: fromCurrency(117, 10),
        taxPayable: fromCurrency(117, 5),
        incomeDate: toNaiveDate('2020-07-16'),
      },
    })
    const expectedResult = fs.readFileSync(path.join(__dirname, 'data', 'fill-opo-form-basic.expected.xml'), 'utf-8')
    expect(result).toEqual(expectedResult)
  })
})
