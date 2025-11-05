use chrono::NaiveDate;

use crate::error::{DkaError, DkaResult};

pub fn format_iso(date: &NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

pub fn parse_iso(str: &str) -> DkaResult<NaiveDate> {
    NaiveDate::parse_from_str(str, "%Y-%m-%d")
        .map_err(|_| DkaError::Generic(format!("Failed to parse date: {}", str)))
}
