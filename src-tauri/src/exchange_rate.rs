use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    error::{DkaError, DkaResult},
    report_parser::ExchangeRateInfo,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct Item {
    #[serde(rename = "Currency")]
    currency: String,
    #[serde(rename = "Unit")]
    scale_factor: f64,
    #[serde(rename = "Middle_Rate")]
    scaled_exchange_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct ExchangeRatesList {
    #[serde(rename = "item")]
    items: Vec<Item>,
}

const NBS_CURRENCIES: &[&'static str] = &[
    "EUR", "GBP", "USD", "AED", "AUD", "CAD", "CHF", "CZK", "DKK", "HUF", "JPY", "NOK", "PLN",
    "SEK", "TRY",
];

pub async fn get_nbs_exchange_rate(date: &NaiveDate, currency_code: &str) -> DkaResult<f64> {
    let url1 = format!(
        "https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/IndexByDate?isSearchExecuted=true&Date={}&ExchangeRateListTypeID=3",
        date.format("%d.%m.%Y"),
    );
    let Ok(result1) = reqwest::get(url1).await else {
        return Err(DkaError::generic("Error fetching from NBS URL"));
    };
    let Ok(body1) = result1.bytes().await else {
        return Err(DkaError::generic("Error fetching body from NBS URL"));
    };

    let body1_str = String::from_utf8_lossy(&body1);

    let url2_regex = Regex::new("/ExchangeRateWebApp/ExchangeRate/Download\\?ExchangeRateListID=(?:[0-9a-f\\-]{36})&.*&Format=xml").unwrap();
    let Some(url2_matches) = url2_regex.captures(&body1_str) else {
        return Err(DkaError::generic("NBS XML URL not found"));
    };

    let url2 = format!("https://webappcenter.nbs.rs{}", &url2_matches[0]);
    let Ok(result2) = reqwest::get(url2).await else {
        return Err(DkaError::generic("Error fetching from NBS XML URL"));
    };

    let Ok(body2) = result2.bytes().await else {
        return Err(DkaError::generic("Error fetching body from NBS XML URL"));
    };

    let body2_str = String::from_utf8_lossy(&body2);

    let erl: ExchangeRatesList = serde_xml_rs::from_str(&body2_str)
        .map_err(|e| DkaError::Generic(format!("Could not parse NBS XML: {}", e)))?;

    let Some(exchange_rate) = erl
        .items
        .iter()
        .find(|item| item.currency == currency_code)
        .map(|item| item.scaled_exchange_rate / item.scale_factor)
    else {
        return Err(DkaError::generic("Could not find exchange rate"));
    };
    Ok(exchange_rate)
}

pub async fn get_exchange_rate(
    date: &NaiveDate,
    currency_code: &str,
    exchange_rate_infos: &[ExchangeRateInfo],
) -> DkaResult<f64> {
    if NBS_CURRENCIES.contains(&currency_code) {
        return get_nbs_exchange_rate(date, currency_code).await;
    }
    let usdrsd = get_nbs_exchange_rate(date, "USD").await?;

    let Some(curbase) = exchange_rate_infos
        .iter()
        .find(|eri| eri.currency_code == currency_code)
        .map(|eri| eri.currency_to_base_currency_rate)
    else {
        return Err(DkaError::generic(
            "Could not find exchange rate in statement",
        ));
    };
    let Some(usdbase) = exchange_rate_infos
        .iter()
        .find(|eri| eri.currency_code == "USD")
        .map(|eri| eri.currency_to_base_currency_rate)
    else {
        return Err(DkaError::generic(
            "Could not find USD exchange rate in statement",
        ));
    };
    return Ok(curbase / usdbase * usdrsd);
}

#[cfg(test)]
mod tests {
    use crate::date::parse_iso;

    use super::*;

    // Live test against NBS site
    #[tokio::test]
    async fn test_nbs_exchange_rate() {
        let rate = get_nbs_exchange_rate(&parse_iso("2020-07-16").unwrap(), "EUR")
            .await
            .unwrap();
        assert!(rate > 117.5945 && rate < 117.5955);
    }
}
