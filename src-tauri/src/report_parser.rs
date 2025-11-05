use std::path::PathBuf;

use chrono::NaiveDate;

use crate::{
    error::DkaResult,
    income_tax::{get_filing_info, FilingInfo},
};

#[derive(Debug, Clone, PartialEq)]
pub struct IncomeInfo {
    pub _type: String,
    pub paying_entity: String,
    pub income_date: NaiveDate,
    pub income_currency_code: String,
    pub income_currency_amount: f64,
    pub wht_currency_code: String,
    pub wht_currency_amount: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExchangeRateInfo {
    pub date: NaiveDate,
    pub currency_code: String,
    pub currency_to_base_currency_rate: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedReport {
    pub income_infos: Vec<IncomeInfo>,
    pub exchange_rate_infos: Vec<ExchangeRateInfo>,
}
impl ParsedReport {
    pub async fn get_filing_infos(&self) -> DkaResult<Vec<FilingInfo>> {
        let mut filing_infos: Vec<FilingInfo> = vec![];
        for income_info in &self.income_infos {
            let filing_info = get_filing_info(income_info, &self.exchange_rate_infos).await?;
            filing_infos.push(filing_info);
        }
        Ok(filing_infos)
    }
}

pub trait ReportParser {
    fn parse(&self, report_path: PathBuf) -> DkaResult<ParsedReport>;
}
