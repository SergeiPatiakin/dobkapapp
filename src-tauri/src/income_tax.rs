use std::cmp::max;

use chrono::{Datelike, Days, NaiveDate, Weekday};

use crate::{
    date::format_iso,
    error::{DkaError, DkaResult},
    exchange_rate::get_exchange_rate,
    ipc_types::HolidayConf,
    report_parser::{ExchangeRateInfo, IncomeInfo},
};

#[derive(Debug, Clone, PartialEq)]
pub struct FilingInfo {
    pub _type: String,
    pub paying_entity: String,
    pub income_date: NaiveDate,
    pub gross_income_rsdc: i64,
    pub wht_paid_rsdc: i64,
    pub gross_tax_payable_rsdc: i64,
    pub tax_payable_rsdc: i64,
}

const PASSIVE_INCOME_TAX_RATE: f64 = 0.15;

pub async fn get_filing_info(
    income_info: &IncomeInfo,
    exchange_rate_infos: &[ExchangeRateInfo],
) -> DkaResult<FilingInfo> {
    let income_exchange_rate = get_exchange_rate(
        &income_info.income_date,
        &income_info.income_currency_code,
        exchange_rate_infos,
    )
    .await?;
    let gross_income_rsdc =
        (income_info.income_currency_amount * income_exchange_rate * 100f64).round() as i64;
    let wht_exchange_rate = get_exchange_rate(
        &income_info.income_date,
        &income_info.wht_currency_code,
        exchange_rate_infos,
    )
    .await?;
    let wht_paid_rsdc =
        (income_info.wht_currency_amount * wht_exchange_rate * 100f64).round() as i64;
    let gross_tax_payable_rsdc =
        (gross_income_rsdc as f64 * PASSIVE_INCOME_TAX_RATE).round() as i64;
    let tax_payable_rsdc = max(gross_tax_payable_rsdc - wht_paid_rsdc, 0);
    Ok(FilingInfo {
        _type: income_info._type.clone(),
        paying_entity: income_info.paying_entity.clone(),
        income_date: income_info.income_date,
        gross_income_rsdc,
        wht_paid_rsdc,
        gross_tax_payable_rsdc,
        tax_payable_rsdc,
    })
}

pub fn get_filing_deadline(
    income_date: &NaiveDate,
    holiday_conf: &HolidayConf,
) -> DkaResult<NaiveDate> {
    let mut deadline: NaiveDate = income_date.checked_add_days(Days::new(30)).unwrap();
    loop {
        let deadline_string: String = format_iso(&deadline);
        if deadline_string < holiday_conf.holiday_range_start {
            return Err(DkaError::generic("Date too early for holiday data range"));
        }
        if deadline_string > holiday_conf.holiday_range_end {
            return Err(DkaError::generic("Date too late for holiday data range"));
        }
        if deadline.weekday() == Weekday::Sat
            || deadline.weekday() == Weekday::Sun
            || holiday_conf.holidays.contains(&deadline_string)
        {
            deadline = deadline.checked_add_days(Days::new(1)).unwrap();
        } else {
            return Ok(deadline);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::date::parse_iso;

    #[tokio::test]
    async fn test_get_filing_info_some_tax() {
        let x = IncomeInfo {
            _type: "dividend".into(),
            paying_entity: "BMW".into(),
            income_date: parse_iso("2025-10-01").unwrap(),
            income_currency_code: "EUR".into(),
            income_currency_amount: 100.0,
            wht_currency_code: "EUR".into(),
            wht_currency_amount: 10.0,
        };
        assert_eq!(
            get_filing_info(&x, &[]).await.unwrap(),
            FilingInfo {
                _type: "dividend".into(),
                paying_entity: "BMW".into(),
                income_date: parse_iso("2025-10-01").unwrap(),
                gross_income_rsdc: 1171697,
                wht_paid_rsdc: 117170,
                gross_tax_payable_rsdc: 175755,
                tax_payable_rsdc: 58585,
            }
        );
    }

    #[tokio::test]
    async fn test_get_filing_info_no_tax() {
        let x = IncomeInfo {
            _type: "dividend".into(),
            paying_entity: "BMW".into(),
            income_date: parse_iso("2025-10-01").unwrap(),
            income_currency_code: "EUR".into(),
            income_currency_amount: 100.0,
            wht_currency_code: "EUR".into(),
            wht_currency_amount: 20.0,
        };
        assert_eq!(
            get_filing_info(&x, &[]).await.unwrap(),
            FilingInfo {
                _type: "dividend".into(),
                paying_entity: "BMW".into(),
                income_date: parse_iso("2025-10-01").unwrap(),
                gross_income_rsdc: 1171697,
                wht_paid_rsdc: 234339,
                gross_tax_payable_rsdc: 175755,
                tax_payable_rsdc: 0,
            }
        );
    }

    #[test]
    fn test_get_filing_deadline_basic() {
        let holiday_conf = HolidayConf {
            holiday_range_start: "2025-01-01".into(),
            holiday_range_end: "2025-12-31".into(),
            holidays: vec!["2025-11-11".into()],
        };
        assert_eq!(
            get_filing_deadline(&parse_iso("2025-06-01").unwrap(), &holiday_conf).unwrap(),
            parse_iso("2025-07-01").unwrap()
        );
        // Weekend
        assert_eq!(
            get_filing_deadline(&parse_iso("2025-06-05").unwrap(), &holiday_conf).unwrap(),
            parse_iso("2025-07-07").unwrap()
        );
        // Holiday
        assert_eq!(
            get_filing_deadline(&parse_iso("2025-10-12").unwrap(), &holiday_conf).unwrap(),
            parse_iso("2025-11-12").unwrap()
        );
    }
}
