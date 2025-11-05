use std::{fs::File, io::Read, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::{
    date::parse_iso,
    error::{DkaError, DkaResult},
    report_parser::{IncomeInfo, ParsedReport, ReportParser},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrivialReport {
    #[serde(rename = "type")]
    _type: String,
    #[serde(rename = "payingEntity")]
    paying_entity: String,
    #[serde(rename = "incomeDate")]
    income_date: String,
    #[serde(rename = "incomeCurrencyCode")]
    income_currency_code: String,
    #[serde(rename = "incomeCurrencyAmount")]
    income_currency_amount: f64,
    #[serde(rename = "whtCurrencyCode")]
    wht_currency_code: String,
    #[serde(rename = "whtCurrencyAmount")]
    wht_currency_amount: f64,
}

pub struct TrivialReportParser {}
impl TrivialReportParser {
    pub fn new() -> Self {
        Self {}
    }
}

impl ReportParser for TrivialReportParser {
    fn parse(&self, report_path: PathBuf) -> DkaResult<ParsedReport> {
        let mut buf: Vec<u8> = vec![];
        let mut file = File::open(report_path)?;
        file.read_to_end(&mut buf)?;
        let trivial_report: TrivialReport = serde_json::from_slice(&buf)
            .map_err(|e| DkaError::Generic(format!("Could not parse manual report: {}", e)))?;
        let income_info = IncomeInfo {
            _type: trivial_report._type,
            paying_entity: trivial_report.paying_entity,
            income_date: parse_iso(&trivial_report.income_date)?,
            income_currency_code: trivial_report.income_currency_code,
            income_currency_amount: trivial_report.income_currency_amount,
            wht_currency_code: trivial_report.wht_currency_code,
            wht_currency_amount: trivial_report.wht_currency_amount,
        };
        Ok(ParsedReport {
            income_infos: vec![income_info],
            exchange_rate_infos: vec![],
        })
    }
}
