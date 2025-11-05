use std::{collections::HashMap, path::PathBuf};

use chrono::NaiveDate;
use csv::StringRecord;
use regex::Regex;

use crate::{
    date::parse_iso,
    error::{DkaError, DkaResult},
    report_parser::{ExchangeRateInfo, IncomeInfo, ParsedReport, ReportParser},
};

pub struct IbkrReportParser {}
impl IbkrReportParser {
    pub fn new() -> Self {
        Self {}
    }
}

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct DividendKey {
    date_str: String,
    entity_name: String,
    entity_isin: String,
}

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct InterestKey {
    date_str: String,
    currency_code: String,
}

fn is_dividend_section_row(row: &StringRecord) -> bool {
    row.len() >= 2 && &row[0] == "Dividends" && &row[1] == "Data"
}

fn is_dividend_row(row: &StringRecord) -> bool {
    row.len() >= 3 && &row[0] == "Dividends" && &row[1] == "Data" && !&row[2].starts_with("Total")
}

fn is_wht_section_row(row: &StringRecord) -> bool {
    row.len() >= 1 && &row[0] == "Withholding Tax"
}

fn is_wht_row(row: &StringRecord) -> bool {
    row.len() >= 3
        && &row[0] == "Withholding Tax"
        && &row[1] == "Data"
        && !&row[2].starts_with("Total")
}

fn is_interest_section_row(row: &StringRecord) -> bool {
    row.len() >= 2 && &row[0] == "Interest" && &row[1] == "Data"
}

fn is_interest_row(row: &StringRecord) -> bool {
    row.len() >= 3 && &row[0] == "Interest" && &row[1] == "Data" && !&row[2].starts_with("Total")
}

fn is_exchange_rate_section_row(row: &StringRecord) -> bool {
    row.len() >= 2 && &row[0] == "Base Currency Exchange Rate" && &row[1] == "Data"
}

fn get_dividend_incomes(string_records: &[StringRecord]) -> DkaResult<Vec<IncomeInfo>> {
    let Some(dividend_section_start_index) = string_records.iter().position(|sr| {
        sr == &StringRecord::from(vec![
            "Dividends",
            "Header",
            "Currency",
            "Date",
            "Description",
            "Amount",
        ])
    }) else {
        return Ok(vec![]);
    };

    let entity_name_regex = Regex::new(r"^([0-9A-Za-z\.]+)\s*\(([0-9A-Za-z]+)\)").unwrap();
    let mut dividend_info_map: HashMap<DividendKey, IncomeInfo> = HashMap::new();
    let mut row_index = dividend_section_start_index;
    loop {
        row_index += 1;
        if row_index >= string_records.len() {
            break;
        }
        let row = &string_records[row_index];
        if !is_dividend_section_row(row) {
            break;
        }
        if !is_dividend_row(row) {
            continue;
        }
        let dividend_currency_code = row[2].to_string();
        let payment_date_str = row[3].to_string();
        let Some(parsed_entity_name) = entity_name_regex.captures(&row[4]) else {
            return Err(DkaError::Generic(format!(
                "Could not parse entity name for dividend: {}",
                &row[4]
            )));
        };
        let paying_entity = parsed_entity_name[1].to_string();
        let paying_entity_isin = parsed_entity_name[2].to_string();
        let dividend_currency_amount: f64 = row[5]
            .parse()
            .map_err(|e| DkaError::Generic(format!("Could not parse float: {}", e)))?;
        match dividend_info_map.get_mut(&DividendKey {
            date_str: payment_date_str.clone(),
            entity_name: paying_entity.clone(),
            entity_isin: paying_entity_isin.clone(),
        }) {
            None => {
                dividend_info_map.insert(
                    DividendKey {
                        date_str: payment_date_str.clone(),
                        entity_name: paying_entity.clone(),
                        entity_isin: paying_entity_isin.clone(),
                    },
                    IncomeInfo {
                        _type: "dividend".into(),
                        paying_entity: paying_entity.clone(),
                        income_date: parse_iso(&payment_date_str).unwrap(),
                        income_currency_code: dividend_currency_code.clone(),
                        income_currency_amount: dividend_currency_amount,
                        wht_currency_code: dividend_currency_code, // Default value, may be overwritten
                        wht_currency_amount: 0.0, // Default value, may be overwritten
                    },
                );
            }
            Some(entry) => {
                if entry.income_currency_code != dividend_currency_code {
                    return Err(DkaError::generic(
                        "Duplicate dividends found with different currencies",
                    ));
                }
                entry.income_currency_amount += dividend_currency_amount;
            }
        };
    }

    if let Some(wht_section_start_index) = string_records.iter().position(|sr| {
        sr == &StringRecord::from(vec![
            "Withholding Tax",
            "Header",
            "Currency",
            "Date",
            "Description",
            "Amount",
            "Code",
        ])
    }) {
        let mut row_index = wht_section_start_index;
        loop {
            row_index += 1;
            if row_index >= string_records.len() {
                break;
            }
            let row = &string_records[row_index];
            if !is_wht_section_row(row) {
                break;
            }
            if !is_wht_row(row) {
                continue;
            }
            let wht_currency_code = row[2].to_string();
            let payment_date_str = row[3].to_string();
            let Some(parsed_entity_name) = entity_name_regex.captures(&row[4]) else {
                return Err(DkaError::Generic(format!(
                    "Could not parse entity name for wht: {}",
                    &row[4]
                )));
            };
            let paying_entity = parsed_entity_name[1].to_string();
            let paying_entity_isin = parsed_entity_name[2].to_string();
            let wht_currency_amount: f64 = row[5]
                .parse()
                .map(|x: f64| -x)
                .map_err(|e| DkaError::Generic(format!("Could not parse float: {}", e)))?;
            match dividend_info_map.get_mut(&DividendKey {
                date_str: payment_date_str,
                entity_name: paying_entity,
                entity_isin: paying_entity_isin,
            }) {
                None => {
                    return Err(DkaError::generic("Could not match wht to dividend"));
                }
                Some(pii) => {
                    if pii.wht_currency_amount != 0.0 && pii.wht_currency_code != wht_currency_code
                    {
                        return Err(DkaError::generic("Two WHT payments for the same dividend payment have different currencies"));
                    }
                    pii.wht_currency_code = wht_currency_code;
                    pii.wht_currency_amount += wht_currency_amount;
                }
            };
        }
    }

    let mut dividend_infos: Vec<_> = dividend_info_map.into_values().collect();
    dividend_infos.sort_by_key(|pii| pii.paying_entity.clone()); // Deterministic order
    Ok(dividend_infos)
}

fn get_interest_incomes(string_records: &[StringRecord]) -> DkaResult<Vec<IncomeInfo>> {
    let Some(interest_section_start_index) = string_records.iter().position(|sr| {
        sr == &StringRecord::from(vec![
            "Interest",
            "Header",
            "Currency",
            "Date",
            "Description",
            "Amount",
        ])
    }) else {
        return Ok(vec![]);
    };
    let mut interest_info_map: HashMap<InterestKey, IncomeInfo> = HashMap::new();
    let mut row_index = interest_section_start_index;
    loop {
        row_index += 1;
        if row_index >= string_records.len() {
            break;
        }
        let row = &string_records[row_index];
        if !is_interest_section_row(row) {
            break;
        }
        if !is_interest_row(row) {
            continue;
        }
        let payment_date_str = row[3].to_string();
        let interest_currency_code = row[2].to_string();
        if !(row[4].starts_with(&format!("{interest_currency_code} Credit Interest for "))
            || row[4].starts_with(&format!("{interest_currency_code} Debit Interest for ")))
        {
            continue;
        }
        let interest_currency_amount: f64 = row[5]
            .parse()
            .map_err(|e| DkaError::Generic(format!("Could not parse float: {}", e)))?;
        interest_info_map
            .entry(InterestKey {
                date_str: payment_date_str.clone(),
                currency_code: interest_currency_code.clone(),
            })
            .and_modify(|e| e.income_currency_amount += interest_currency_amount)
            .or_insert(IncomeInfo {
                _type: "interest".into(),
                paying_entity: "Interactive Brokers".into(),
                income_date: parse_iso(&payment_date_str).unwrap(),
                income_currency_code: interest_currency_code.clone(),
                income_currency_amount: interest_currency_amount,
                wht_currency_code: interest_currency_code,
                wht_currency_amount: 0.0,
            });
    }

    let mut interest_infos: Vec<_> = interest_info_map
        .into_values()
        .filter(|pii| pii.income_currency_amount > 0.0)
        .collect();
    interest_infos.sort_by_key(|pii| (pii.income_date.clone(), pii.income_currency_code.clone())); // Deterministic order
    Ok(interest_infos)
}

fn get_exchange_rate_infos(string_records: &[StringRecord]) -> DkaResult<Vec<ExchangeRateInfo>> {
    let Some(statement_period_index) = string_records.iter().position(|sr| {
        sr.len() >= 4 && &sr[0] == "Statement" && &sr[1] == "Data" && &sr[2] == "Period"
    }) else {
        return Err(DkaError::generic("Cannot find statement period"));
    };
    let statement_day =
        NaiveDate::parse_from_str(&string_records[statement_period_index][3], "%B %d, %Y")
            .map_err(|_| DkaError::generic("Could not parse date"))?;

    let Some(exchange_rate_section_start_index) = string_records.iter().position(|sr| {
        sr.len() >= 4
            && &sr[0] == "Base Currency Exchange Rate"
            && &sr[1] == "Header"
            && &sr[2] == "Currency"
            && &sr[3] == "Rate"
    }) else {
        return Ok(vec![]);
    };
    let mut row_index = exchange_rate_section_start_index;
    let mut exchange_rate_infos: Vec<ExchangeRateInfo> = vec![];
    let mut saw_usd_rate: bool = false;
    loop {
        row_index += 1;
        if row_index >= string_records.len() {
            break;
        }
        let row = &string_records[row_index];
        if !is_exchange_rate_section_row(row) {
            break;
        }
        let currency_code = row[2].to_string();
        if currency_code == "USD" {
            saw_usd_rate = true;
        }
        let currency_to_base_currency_rate: f64 = row[3]
            .parse()
            .map_err(|e| DkaError::Generic(format!("Could not parse float: {}", e)))?;
        exchange_rate_infos.push(ExchangeRateInfo {
            date: statement_day.clone(),
            currency_code,
            currency_to_base_currency_rate,
        });
    }
    if !saw_usd_rate {
        // USD must be the base currency
        exchange_rate_infos.push(ExchangeRateInfo {
            date: statement_day.clone(),
            currency_code: "USD".into(),
            currency_to_base_currency_rate: 1.0,
        });
    }
    Ok(exchange_rate_infos)
}

impl ReportParser for IbkrReportParser {
    fn parse(&self, report_path: PathBuf) -> DkaResult<ParsedReport> {
        let file = std::fs::File::open(report_path)?;
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_reader(file);
        let mut string_records: Vec<StringRecord> = vec![];
        for result in rdr.records() {
            let string_record = match result {
                Ok(string_record) => string_record,
                Err(e) => {
                    return Err(DkaError::Generic(format!("CSV parse error {}", e)));
                }
            };
            string_records.push(string_record);
        }
        let mut income_infos: Vec<IncomeInfo> = vec![];
        income_infos.append(&mut get_dividend_incomes(&string_records)?);
        income_infos.append(&mut get_interest_incomes(&string_records)?);
        Ok(ParsedReport {
            income_infos,
            exchange_rate_infos: get_exchange_rate_infos(&string_records)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::{io::Write, vec};

    use crate::{
        date::parse_iso,
        ibkr_report_parser::IbkrReportParser,
        report_parser::{ExchangeRateInfo, IncomeInfo, ReportParser},
    };

    #[test]
    fn test_ibkr_dividend_1() {
        let csv_content = include_bytes!("../tests/data/ibkr-dividend1.csv");
        let mut tempfile = tempfile::NamedTempFile::new().unwrap();
        tempfile.write(csv_content).unwrap();
        let report_parser = IbkrReportParser::new();
        let parsed_report = report_parser.parse(tempfile.path().to_path_buf()).unwrap();
        assert_eq!(
            parsed_report.income_infos,
            vec![IncomeInfo {
                _type: "dividend".into(),
                income_currency_code: "EUR".into(),
                paying_entity: "ABC".into(),
                income_currency_amount: 60.0,
                wht_currency_code: "EUR".into(),
                wht_currency_amount: 6.0,
                income_date: parse_iso("2023-01-12").unwrap(),
            }],
        );
    }

    #[test]
    fn test_ibkr_dividend_2() {
        let csv_content = include_bytes!("../tests/data/ibkr-dividend2.csv");
        let mut tempfile = tempfile::NamedTempFile::new().unwrap();
        tempfile.write(csv_content).unwrap();
        let report_parser = IbkrReportParser::new();
        let parsed_report = report_parser.parse(tempfile.path().to_path_buf()).unwrap();
        assert_eq!(
            parsed_report.income_infos,
            vec![
                // One dividend from ABC in EUR
                IncomeInfo {
                    _type: "dividend".into(),
                    income_currency_code: "EUR".into(),
                    paying_entity: "ABC".into(),
                    income_currency_amount: 60.0,
                    wht_currency_code: "EUR".into(),
                    wht_currency_amount: 0.0,
                    income_date: parse_iso("2023-01-12").unwrap(),
                },
                // One dividend from DEF1 in GBP
                IncomeInfo {
                    _type: "dividend".into(),
                    income_currency_code: "GBP".into(),
                    paying_entity: "DEF1".into(),
                    income_currency_amount: 70.0,
                    wht_currency_code: "GBP".into(),
                    wht_currency_amount: 0.0,
                    income_date: parse_iso("2023-01-12").unwrap(),
                },
                // Two dividends from DEF2 in GBP, merged together
                IncomeInfo {
                    _type: "dividend".into(),
                    income_currency_code: "GBP".into(),
                    paying_entity: "DEF2".into(),
                    income_currency_amount: 143.0, // Sum of amounts: 71 + 72
                    wht_currency_code: "GBP".into(),
                    wht_currency_amount: 0.0,
                    income_date: parse_iso("2023-01-12").unwrap(),
                },
            ],
        );
    }

    #[test]
    fn test_ibkr_interest_1() {
        let csv_content = include_bytes!("../tests/data/ibkr-interest1.csv");
        let mut tempfile = tempfile::NamedTempFile::new().unwrap();
        tempfile.write(csv_content).unwrap();
        let report_parser = IbkrReportParser::new();
        let parsed_report = report_parser.parse(tempfile.path().to_path_buf()).unwrap();
        assert_eq!(
            parsed_report.income_infos,
            vec![IncomeInfo {
                _type: "interest".into(),
                income_currency_code: "EUR".into(),
                paying_entity: "Interactive Brokers".into(),
                income_currency_amount: 12.34,
                wht_currency_code: "EUR".into(),
                wht_currency_amount: 0.0,
                income_date: parse_iso("2023-02-03").unwrap(),
            },],
        );
    }

    #[test]
    fn test_ibkr_interest_2() {
        let csv_content = include_bytes!("../tests/data/ibkr-interest2.csv");
        let mut tempfile = tempfile::NamedTempFile::new().unwrap();
        tempfile.write(csv_content).unwrap();
        let report_parser = IbkrReportParser::new();
        let parsed_report = report_parser.parse(tempfile.path().to_path_buf()).unwrap();
        assert_eq!(
            parsed_report.income_infos,
            vec![IncomeInfo {
                _type: "interest".into(),
                income_currency_code: "EUR".into(),
                paying_entity: "Interactive Brokers".into(),
                income_currency_amount: 10.00, // debit interest deducted from credit interest in same currency
                wht_currency_code: "EUR".into(),
                wht_currency_amount: 0.0,
                income_date: parse_iso("2023-01-05").unwrap(),
            },],
        );
    }

    #[test]
    fn test_full() {
        let csv_content = include_bytes!("../tests/data/ibkr-full1.csv");
        let mut tempfile = tempfile::NamedTempFile::new().unwrap();
        tempfile.write(csv_content).unwrap();
        let report_parser = IbkrReportParser::new();
        let parsed_report = report_parser.parse(tempfile.path().to_path_buf()).unwrap();
        assert_eq!(
            parsed_report.income_infos,
            vec![
                IncomeInfo {
                    _type: "dividend".into(),
                    income_currency_code: "EUR".into(),
                    paying_entity: "ABC".into(),
                    income_currency_amount: 60.00,
                    wht_currency_code: "EUR".into(),
                    wht_currency_amount: 6.0,
                    income_date: parse_iso("2023-01-12").unwrap(),
                },
                IncomeInfo {
                    _type: "interest".into(),
                    income_currency_code: "EUR".into(),
                    paying_entity: "Interactive Brokers".into(),
                    income_currency_amount: 12.34,
                    wht_currency_code: "EUR".into(),
                    wht_currency_amount: 0.0,
                    income_date: parse_iso("2023-01-03").unwrap(),
                },
            ],
        );
        assert!(parsed_report
            .exchange_rate_infos
            .contains(&ExchangeRateInfo {
                date: parse_iso("2023-01-13").unwrap(),
                currency_code: "CAD".into(),
                currency_to_base_currency_rate: 0.689070,
            }))
    }
}
