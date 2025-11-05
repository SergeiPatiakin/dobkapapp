use chrono::NaiveDate;

use crate::{
    date::format_iso,
    error::DkaResult,
    income_tax::{get_filing_deadline, FilingInfo},
    ipc_types::{HolidayConf, TaxpayerProfile},
};

const SVP_INTEREST: &str = "111401000";
const SVP_DIVIDEND: &str = "111402000";

fn format_rsd_amount(amount_rsdc: i64) -> String {
    let whole = format!("{}", amount_rsdc / 100);
    let frac = format!("{:0>2}", amount_rsdc % 100);
    format!("{whole}.{frac}")
}

#[derive(Debug, Clone)]
pub struct OpoData {
    pub jmbg: String,
    pub full_name: String,
    pub street_address: String,
    pub opstina_code: String,
    pub filer_jmbg: String,
    pub phone_number: String,
    pub email: String,
    pub realization_method: String,
    pub filing_deadline: NaiveDate,
    pub filing_info: FilingInfo,
}
impl OpoData {
    pub fn new(
        pifi: &FilingInfo,
        payment_notes: &str,
        taxpayer_profile: &TaxpayerProfile,
        holiday_conf: &HolidayConf,
    ) -> DkaResult<Self> {
        let filing_deadline = get_filing_deadline(&pifi.income_date, holiday_conf)?;
        Ok(OpoData {
            jmbg: taxpayer_profile.jmbg.clone(),
            full_name: taxpayer_profile.full_name.clone(),
            street_address: taxpayer_profile.street_address.clone(),
            opstina_code: taxpayer_profile.opstina_code.clone(),
            filer_jmbg: taxpayer_profile.jmbg.clone(),
            phone_number: taxpayer_profile.phone_number.clone(),
            email: taxpayer_profile.email_address.clone(),
            realization_method: payment_notes.to_string(),
            filing_deadline,
            filing_info: pifi.clone(),
        })
    }
    pub fn fill(&self) -> String {
        format!(
            "
            <ns1:PodaciPoreskeDeklaracije
                xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
                xmlns:ns1='http://pid.purs.gov.rs'>
                <ns1:PodaciOPrijavi>
                    <ns1:VrstaPrijave>1</ns1:VrstaPrijave>
                    <ns1:ObracunskiPeriod>{}</ns1:ObracunskiPeriod>
                    <ns1:DatumOstvarivanjaPrihoda>{}</ns1:DatumOstvarivanjaPrihoda>
                    <ns1:Rok>1</ns1:Rok>
                    <ns1:DatumDospelostiObaveze>{}</ns1:DatumDospelostiObaveze>
                    </ns1:PodaciOPrijavi>
                    <ns1:PodaciOPoreskomObvezniku>
                        <ns1:PoreskiIdentifikacioniBroj>{}</ns1:PoreskiIdentifikacioniBroj>
                    <ns1:ImePrezimeObveznika>
                        <![CDATA[{}]]>
                    </ns1:ImePrezimeObveznika>
                    <ns1:UlicaBrojPoreskogObveznika>
                        <![CDATA[{}]]>
                    </ns1:UlicaBrojPoreskogObveznika>
                    <ns1:PrebivalisteOpstina>{}</ns1:PrebivalisteOpstina>
                    <ns1:JMBGPodnosiocaPrijave>{}</ns1:JMBGPodnosiocaPrijave>
                    <ns1:TelefonKontaktOsobe>{}</ns1:TelefonKontaktOsobe>
                    <ns1:ElektronskaPosta>{}</ns1:ElektronskaPosta>
                    </ns1:PodaciOPoreskomObvezniku>
                    <ns1:PodaciONacinuOstvarivanjaPrihoda>
                        <ns1:NacinIsplate>3</ns1:NacinIsplate>
                    <ns1:Ostalo>{}</ns1:Ostalo>
                    </ns1:PodaciONacinuOstvarivanjaPrihoda>
                    <ns1:DeklarisaniPodaciOVrstamaPrihoda>
                        <ns1:PodaciOVrstamaPrihoda>
                            <ns1:RedniBroj>1</ns1:RedniBroj>
                            <ns1:SifraVrstePrihoda>{}</ns1:SifraVrstePrihoda>
                            <ns1:BrutoPrihod>{}</ns1:BrutoPrihod>
                            <ns1:OsnovicaZaPorez>{}</ns1:OsnovicaZaPorez>
                            <ns1:ObracunatiPorez>{}</ns1:ObracunatiPorez>
                            <ns1:PorezPlacenDrugojDrzavi>{}</ns1:PorezPlacenDrugojDrzavi>
                            <ns1:PorezZaUplatu>{}</ns1:PorezZaUplatu>
                        </ns1:PodaciOVrstamaPrihoda>
                </ns1:DeklarisaniPodaciOVrstamaPrihoda>
                <ns1:Ukupno>
                    <ns1:FondSati>0.00</ns1:FondSati>
                    <ns1:BrutoPrihod>{}</ns1:BrutoPrihod>
                    <ns1:OsnovicaZaPorez>{}</ns1:OsnovicaZaPorez>
                    <ns1:ObracunatiPorez>{}</ns1:ObracunatiPorez>
                    <ns1:PorezPlacenDrugojDrzavi>{}</ns1:PorezPlacenDrugojDrzavi>
                    <ns1:PorezZaUplatu>{}</ns1:PorezZaUplatu>
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
    ",
            self.filing_info.income_date.format("%Y-%m"),
            format_iso(&self.filing_info.income_date),
            format_iso(&self.filing_deadline),
            self.jmbg,
            self.full_name,
            self.street_address,
            self.opstina_code,
            self.filer_jmbg,
            self.phone_number,
            self.email,
            self.realization_method,
            if self.filing_info._type == "dividend" {
                SVP_DIVIDEND
            } else {
                SVP_INTEREST
            },
            format_rsd_amount(self.filing_info.gross_income_rsdc),
            format_rsd_amount(self.filing_info.gross_income_rsdc),
            format_rsd_amount(self.filing_info.gross_tax_payable_rsdc),
            format_rsd_amount(self.filing_info.wht_paid_rsdc),
            format_rsd_amount(self.filing_info.tax_payable_rsdc),
            format_rsd_amount(self.filing_info.gross_income_rsdc),
            format_rsd_amount(self.filing_info.gross_income_rsdc),
            format_rsd_amount(self.filing_info.gross_tax_payable_rsdc),
            format_rsd_amount(self.filing_info.wht_paid_rsdc),
            format_rsd_amount(self.filing_info.tax_payable_rsdc),
        )
    }
}

// TODO: unit test
