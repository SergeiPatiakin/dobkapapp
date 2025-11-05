use crate::error::{DkaError, DkaResult};
use serde::{self, Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolidayConf {
    #[serde(rename = "holidayRangeStart")]
    pub holiday_range_start: String,
    #[serde(rename = "holidayRangeEnd")]
    pub holiday_range_end: String,
    pub holidays: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalConf {
    #[serde(rename = "holidayConf")]
    pub holiday_conf: HolidayConf,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MailboxCursor {
    #[serde(rename = "date")]
    Date {
        #[serde(rename = "dateString")]
        date_string: String,
    },
    #[serde(rename = "uid")]
    Uid {
        #[serde(rename = "lastSeenUid")]
        last_seen_uid: i64,
        #[serde(rename = "lastSeenDatetime")]
        last_seen_datetime: i64,
    },
}

impl MailboxCursor {
    pub fn to_db_string(&self) -> String {
        match self {
            MailboxCursor::Date { date_string } => format!("date,{}", date_string),
            MailboxCursor::Uid {
                last_seen_uid,
                last_seen_datetime,
            } => {
                format!("uid,{},{last_seen_datetime}", last_seen_uid)
            }
        }
    }
    pub fn from_db_string(s: &str) -> DkaResult<Self> {
        let parts: Vec<&str> = s.split(',').collect();
        match parts.as_slice() {
            ["date", date_str] => Ok(MailboxCursor::Date {
                date_string: (*date_str).to_string(),
            }),
            ["uid", uid_str, dt_str] => {
                let uid = uid_str
                    .parse::<i64>()
                    .map_err(|_e| DkaError::Generic("could not parse uid".into()))?;
                let dt = dt_str
                    .parse::<i64>()
                    .map_err(|_e| DkaError::Generic("could not parse dt".into()))?;
                Ok(MailboxCursor::Uid {
                    last_seen_uid: uid,
                    last_seen_datetime: dt,
                })
            }
            _ => Err(DkaError::Generic("invalid mailbox cursor format".into())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mailbox {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "emailAddress")]
    pub email_address: String,
    #[serde(rename = "emailPassword")]
    pub email_password: String,
    #[serde(rename = "imapHost")]
    pub imap_host: String,
    #[serde(rename = "imapPort")]
    pub imap_port: i32,
    #[serde(rename = "cursor")]
    pub cursor: MailboxCursor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxpayerProfile {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "jmbg")]
    pub jmbg: String,
    #[serde(rename = "fullName")]
    pub full_name: String,
    #[serde(rename = "streetAddress")]
    pub street_address: String,
    #[serde(rename = "opstinaCode")]
    pub opstina_code: String,
    #[serde(rename = "phoneNumber")]
    pub phone_number: String,
    #[serde(rename = "emailAddress")]
    pub email_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Importer {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "reportType")]
    pub report_type: String,
    #[serde(rename = "taxpayerProfileId")]
    pub taxpayer_profile_id: i32,
    #[serde(rename = "mailboxId")]
    pub mailbox_id: i32,
    #[serde(rename = "fromFilter")]
    pub from_filter: String,
    #[serde(rename = "subjectFilter")]
    pub subject_filter: String,
    #[serde(rename = "paymentNotes")]
    pub payment_notes: String,
    #[serde(rename = "attachmentRegex")]
    pub attachment_regex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "type")]
    pub _type: String,
    #[serde(rename = "importerId")]
    pub importer_id: Option<i32>,
    #[serde(rename = "mailboxId")]
    pub mailbox_id: i32,
    #[serde(rename = "mailboxMessageId")]
    pub mailbox_message_id: i32,
    #[serde(rename = "reportName")]
    pub report_name: String,
    #[serde(rename = "status")]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Filing {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "reportId")]
    pub report_id: i32,
    #[serde(rename = "type")]
    pub _type: String,
    #[serde(rename = "status")]
    pub status: String,
    #[serde(rename = "payingEntity")]
    pub paying_entity: String,
    #[serde(rename = "filingDeadline")]
    pub filing_deadline: String,
    #[serde(rename = "taxPayable")]
    pub tax_payable: i64,
    #[serde(rename = "taxPaymentReference")]
    pub tax_payment_reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JobMessage {
    #[serde(rename = "report")]
    Report {
        #[serde(rename = "from")]
        from: String,
        #[serde(rename = "subject")]
        subject: String,
        #[serde(rename = "attachmentName")]
        attachment_name: String,
    },
    #[serde(rename = "error")]
    Error {
        #[serde(rename = "message")]
        message: String,
    },
    #[serde(rename = "success")]
    Success {
        #[serde(rename = "message")]
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "completed")]
    pub completed: bool,
    #[serde(rename = "canceled")]
    pub canceled: bool,
    #[serde(rename = "messages")]
    pub messages: Vec<JobMessage>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mailbox_cursor_date_to_db_string() {
        let cursor = MailboxCursor::Date {
            date_string: "2025-10-14".to_string(),
        };
        assert_eq!(cursor.to_db_string(), "date,2025-10-14");
    }

    #[test]
    fn test_mailbox_cursor_uid_to_db_string() {
        let cursor = MailboxCursor::Uid {
            last_seen_uid: 42,
            last_seen_datetime: 1234567890,
        };
        assert_eq!(cursor.to_db_string(), "uid,42,1234567890");
    }

    #[test]
    fn test_mailbox_cursor_date_from_db_string() {
        let s = "date,2025-10-14";
        assert_eq!(
            MailboxCursor::from_db_string(s).unwrap(),
            MailboxCursor::Date {
                date_string: "2025-10-14".to_string()
            }
        );
    }

    #[test]
    fn test_mailbox_cursor_uid_from_db_string() {
        let s = "uid,42,1234567890";
        assert_eq!(
            MailboxCursor::from_db_string(s).unwrap(),
            MailboxCursor::Uid {
                last_seen_uid: 42,
                last_seen_datetime: 1234567890
            }
        );
    }

    #[test]
    fn test_mailbox_cursor_invalid_from_db_string() {
        let s = "bad,format,here,extra";
        let result: Result<MailboxCursor, _> = MailboxCursor::from_db_string(s);
        assert!(result.is_err());
    }
}
