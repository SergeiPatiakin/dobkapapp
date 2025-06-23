import { PassiveIncomeFilingInfo } from "../passive-income";
import { NaiveDate } from "../data-types";
import { formatRsdAmount } from "../rsd-amount";
import { HolidayService } from "../holidays";
import { XMLParser, XMLBuilder } from "fast-xml-parser"

export interface OpoData {
  jmbg: string
  fullName: string
  streetAddress: string
  opstinaCode: string
  filerJmbg: string
  phoneNumber: string
  email: string
  realizationMethod: string
  filingDeadline: NaiveDate
  passiveIncomeFilingInfo: PassiveIncomeFilingInfo
}

const TAX_FILING_DEADLINE_OFFSET = 30
const SVP_INTEREST = "111401000"
const SVP_DIVIDEND = "111402000"

export const getFilingDeadline = (holidayService: HolidayService, paymentDate: NaiveDate) => holidayService.workingDayAfter(paymentDate, TAX_FILING_DEADLINE_OFFSET)

export const fillOpoForm = (data: OpoData): string => {
  const opoTemplateContents = `
    <ns1:PodaciPoreskeDeklaracije
      xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
      xmlns:ns1='http://pid.purs.gov.rs'>
      <ns1:PodaciOPrijavi>
          <ns1:VrstaPrijave>1</ns1:VrstaPrijave>
          <ns1:ObracunskiPeriod></ns1:ObracunskiPeriod>
          <ns1:DatumOstvarivanjaPrihoda></ns1:DatumOstvarivanjaPrihoda>
          <ns1:Rok>1</ns1:Rok>
          <ns1:DatumDospelostiObaveze></ns1:DatumDospelostiObaveze>
          </ns1:PodaciOPrijavi>
          <ns1:PodaciOPoreskomObvezniku>
              <ns1:PoreskiIdentifikacioniBroj></ns1:PoreskiIdentifikacioniBroj>
          <ns1:ImePrezimeObveznika></ns1:ImePrezimeObveznika>
          <ns1:UlicaBrojPoreskogObveznika></ns1:UlicaBrojPoreskogObveznika>
          <ns1:PrebivalisteOpstina></ns1:PrebivalisteOpstina>
          <ns1:JMBGPodnosiocaPrijave></ns1:JMBGPodnosiocaPrijave>
          <ns1:TelefonKontaktOsobe></ns1:TelefonKontaktOsobe>
          <ns1:ElektronskaPosta></ns1:ElektronskaPosta>
          </ns1:PodaciOPoreskomObvezniku>
          <ns1:PodaciONacinuOstvarivanjaPrihoda>
              <ns1:NacinIsplate>3</ns1:NacinIsplate>
          <ns1:Ostalo></ns1:Ostalo>
          </ns1:PodaciONacinuOstvarivanjaPrihoda>
          <ns1:DeklarisaniPodaciOVrstamaPrihoda>
              <ns1:PodaciOVrstamaPrihoda>
                  <ns1:RedniBroj>1</ns1:RedniBroj>
                  <ns1:SifraVrstePrihoda></ns1:SifraVrstePrihoda>
                  <ns1:BrutoPrihod></ns1:BrutoPrihod>
                  <ns1:OsnovicaZaPorez></ns1:OsnovicaZaPorez>
                  <ns1:ObracunatiPorez></ns1:ObracunatiPorez>
                  <ns1:PorezPlacenDrugojDrzavi></ns1:PorezPlacenDrugojDrzavi>
                  <ns1:PorezZaUplatu></ns1:PorezZaUplatu>
              </ns1:PodaciOVrstamaPrihoda>
      </ns1:DeklarisaniPodaciOVrstamaPrihoda>
      <ns1:Ukupno>
          <ns1:FondSati>0.00</ns1:FondSati>
          <ns1:BrutoPrihod></ns1:BrutoPrihod>
          <ns1:OsnovicaZaPorez></ns1:OsnovicaZaPorez>
          <ns1:ObracunatiPorez></ns1:ObracunatiPorez>
          <ns1:PorezPlacenDrugojDrzavi></ns1:PorezPlacenDrugojDrzavi>
          <ns1:PorezZaUplatu></ns1:PorezZaUplatu>
          <ns1:OsnovicaZaDoprinose>0.00</ns1:OsnovicaZaDoprinose>
          <ns1:PIO>0.00</ns1:PIO>
          <ns1:ZDRAVSTVO>0.00</ns1:ZDRAVSTVO>
          <ns1:NEZAPOSLENOST>0.00</ns1:NEZAPOSLENOST>
      </ns1:Ukupno>
      <ns1:Kamata>
          <ns1:PorezZaUplatu>0</ns1:PorezZaUplatu>
          <ns1:OsnovicaZaDoprinose>0</ns1:OsnovicaZaDoprinose>
          <ns1:PIO>0</ns1:PIO>
          <ns1:ZDRAVSTVO>0</ns1:ZDRAVSTVO>
          <ns1:NEZAPOSLENOST>0</ns1:NEZAPOSLENOST>
      </ns1:Kamata>
      <ns1:PodaciODodatnojKamati>
      </ns1:PodaciODodatnojKamati>
  </ns1:PodaciPoreskeDeklaracije>
  `

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })
  const document = parser.parse(opoTemplateContents)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPrijavi']['ns1:ObracunskiPeriod'] = data.passiveIncomeFilingInfo.incomeDate.format('YYYY-MM')
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPrijavi']['ns1:DatumOstvarivanjaPrihoda'] = data.passiveIncomeFilingInfo.incomeDate.format('YYYY-MM-DD')
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPrijavi']['ns1:DatumDospelostiObaveze'] = data.filingDeadline.format('YYYY-MM-DD')

  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:PoreskiIdentifikacioniBroj'] = data.jmbg
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:ImePrezimeObveznika'] = { cdataContent: data.fullName }
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:UlicaBrojPoreskogObveznika'] = { cdataContent: data.streetAddress }
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:PrebivalisteOpstina'] = data.opstinaCode
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:JMBGPodnosiocaPrijave'] = data.filerJmbg
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:TelefonKontaktOsobe'] = data.phoneNumber
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciOPoreskomObvezniku']['ns1:ElektronskaPosta'] = data.email
  
  document['ns1:PodaciPoreskeDeklaracije']['ns1:PodaciONacinuOstvarivanjaPrihoda']['ns1:Ostalo'] = data.realizationMethod
  
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:SifraVrstePrihoda'] = ((): string => {
    switch(data.passiveIncomeFilingInfo.type) {
      case 'dividend': return SVP_DIVIDEND
      case 'interest': return SVP_INTEREST
    }
  })()
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:BrutoPrihod'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossIncome)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:OsnovicaZaPorez'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossIncome)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:ObracunatiPorez'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossTaxPayable)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:PorezPlacenDrugojDrzavi'] = formatRsdAmount(data.passiveIncomeFilingInfo.taxPaidAbroad)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:DeklarisaniPodaciOVrstamaPrihoda']['ns1:PodaciOVrstamaPrihoda']['ns1:PorezZaUplatu'] = formatRsdAmount(data.passiveIncomeFilingInfo.taxPayable)
  
  document['ns1:PodaciPoreskeDeklaracije']['ns1:Ukupno']['ns1:BrutoPrihod'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossIncome)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:Ukupno']['ns1:OsnovicaZaPorez'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossIncome)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:Ukupno']['ns1:ObracunatiPorez'] = formatRsdAmount(data.passiveIncomeFilingInfo.grossTaxPayable)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:Ukupno']['ns1:PorezPlacenDrugojDrzavi'] = formatRsdAmount(data.passiveIncomeFilingInfo.taxPaidAbroad)
  document['ns1:PodaciPoreskeDeklaracije']['ns1:Ukupno']['ns1:PorezZaUplatu'] = formatRsdAmount(data.passiveIncomeFilingInfo.taxPayable)

  const builder = new XMLBuilder({ format: true, ignoreAttributes: false, cdataPropName: 'cdataContent' })
  const opoFormContents = `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build(document)

  return opoFormContents
}
