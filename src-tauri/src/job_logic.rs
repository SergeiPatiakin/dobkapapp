use std::collections::{HashMap, HashSet};
use std::net::TcpStream;

use mail_parser::{MessageParser, MimeHeaders};
use regex::Regex;
use rustls_connector::RustlsConnector;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::sync::Mutex;

use crate::database::{
    create_filing, create_report, get_reports_by_mailbox, get_taxpayer_profile, update_mailbox,
    update_report,
};
use crate::date::format_iso;
use crate::error::DkaError;
use crate::filesystem::{
    get_report_path, get_technical_conf, save_filing_content, save_report_content,
};
use crate::ibkr_report_parser::IbkrReportParser;
use crate::ipc_types::{Filing, Importer, Mailbox, Report};
use crate::opo_data::OpoData;
use crate::report_parser::ReportParser;
use crate::trivial_report_parser::TrivialReportParser;
use crate::{
    database::{get_importers, get_mailbox},
    error::DkaResult,
    ipc_types::{JobMessage, MailboxCursor},
    job_store::JobStore,
};

fn format_date_string_for_imap(date_string: &str) -> DkaResult<String> {
    let fragments: Vec<_> = date_string.split("-").collect();
    if fragments.len() != 3 {
        return Err(DkaError::generic("Date string should have 3 fragments"));
    }
    let month: u8 = fragments[1]
        .parse()
        .map_err(|_| DkaError::generic("Date string month could not be parsed"))?;
    if month == 0 || month > 12 {
        return Err(DkaError::generic("Date string month is invalid"));
    }
    let month_name = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ][(month - 1) as usize];
    Ok(format!("{}-{}-{}", fragments[2], month_name, fragments[0]))
}

fn get_search_string(
    from_filter: &str,
    subject_filter: &str,
    cursor: &MailboxCursor,
) -> DkaResult<String> {
    let mut fragments: Vec<String> = vec![];
    if from_filter != "" {
        fragments.push(format!("FROM \"{}\"", from_filter));
    }
    if subject_filter != "" {
        fragments.push(format!("SUBJECT \"{}\"", subject_filter));
    }
    match cursor {
        MailboxCursor::Date { date_string } => {
            fragments.push(format!(
                "SINCE {}",
                format_date_string_for_imap(date_string)?
            ));
        }
        MailboxCursor::Uid { last_seen_uid, .. } => {
            let uid_range_string = format!("{}:*", last_seen_uid + 1);
            fragments.push(format!("UID {}", uid_range_string));
        }
    }
    Ok(fragments.join(" "))
}

async fn process_email_message(
    u: u32,
    message_importer_ids: &[i32],
    mailbox: &Mailbox,
    importers: &[Importer],
    job_id: i32,
    job_store_mutex: &Mutex<JobStore>,
    imap_session: &mut imap::Session<
        rustls::StreamOwned<rustls_connector::rustls::ClientConnection, TcpStream>,
    >,
    app_handle: &AppHandle,
) -> DkaResult<()> {
    let mut job_store_guard = job_store_mutex.lock().await;
    if job_store_guard.is_cancelled(job_id) {
        job_store_guard.add_message(
            job_id,
            JobMessage::Error {
                message: "cancelled".into(),
            },
        );
        job_store_guard.set_completed(job_id);
        return Ok(());
    }
    drop(job_store_guard);
    let messages = imap_session.uid_fetch(u.to_string(), "RFC822")?;
    let Some(message) = messages.iter().find(|m| m.uid == Some(u)) else {
        return Ok(());
    };
    let Some(message_body) = message.body() else {
        return Ok(());
    };

    let Some(parsed_message) = MessageParser::default().parse(message_body) else {
        return Ok(());
    };
    let from = parsed_message
        .from()
        .and_then(|a| a.iter().next())
        .and_then(|a| a.address())
        .unwrap_or("");
    let subject = parsed_message.subject().unwrap_or("");
    for importer_id in message_importer_ids.iter() {
        let importer = importers
            .iter()
            .find(|im| im.id == *importer_id)
            .expect("importer should be present in the list of all importers");
        let attachment_regex = Regex::new(&importer.attachment_regex)
            .map_err(|e| DkaError::Generic(format!("Bad attachment regex: {}", e)))?;
        for attachment in parsed_message.attachments() {
            let Some(attachment_name) = attachment.attachment_name() else {
                continue;
            };
            if !attachment_regex.is_match(attachment_name) {
                continue;
            }
            let report_id = create_report(
                app_handle,
                &Report {
                    id: 0,
                    _type: importer.report_type.clone(),
                    importer_id: Some(*importer_id),
                    mailbox_id: mailbox.id,
                    mailbox_message_id: u as i32,
                    report_name: attachment_name.into(),
                    status: "init".into(),
                },
            )?;
            save_report_content(app_handle, report_id, attachment.contents())?;
            job_store_mutex.lock().await.add_message(
                job_id,
                JobMessage::Report {
                    from: from.into(),
                    subject: subject.into(),
                    attachment_name: attachment_name.into(),
                },
            );
        }
    }
    let mut new_mailbox = mailbox.clone();
    new_mailbox.cursor = MailboxCursor::Uid {
        last_seen_uid: u as i64,
        last_seen_datetime: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("System clock is before epoch")
            .as_millis() as i64,
    };
    update_mailbox(app_handle, &new_mailbox)?;
    Ok(())
}

pub async fn run_job(
    job_id: i32,
    job_store_mutex: &Mutex<JobStore>,
    app_handle: &AppHandle,
) -> DkaResult<()> {
    let mailbox = get_mailbox(app_handle)?;
    let importers = get_importers(app_handle)?;
    let stream = TcpStream::connect((mailbox.imap_host.as_ref(), mailbox.imap_port as u16))?;
    let tls = RustlsConnector::new_with_native_certs()?;
    let tlsstream = tls
        .connect(mailbox.imap_host.as_ref(), stream)
        .map_err(|_| DkaError::generic("TLS handshake error"))?;
    let client = imap::Client::new(tlsstream);
    let mut imap_session = client
        .login(&mailbox.email_address, &mailbox.email_password)
        .map_err(|e| e.0)?;
    let inbox = imap_session.select("INBOX")?;
    if inbox.uid_validity.is_none() {
        return Err(DkaError::generic(
            "Mailbox does not support persistent UIDs",
        ));
    }
    let mut importers_by_message_uid: HashMap<u32, Vec<i32>> = HashMap::new();
    for importer in importers.iter() {
        let search_string = get_search_string(
            &importer.from_filter,
            &importer.subject_filter,
            &mailbox.cursor,
        )?;
        let search_result = imap_session.uid_search(search_string)?;
        for uid in search_result {
            importers_by_message_uid
                .entry(uid)
                .and_modify(|v| {
                    v.push(importer.id);
                })
                .or_insert(vec![importer.id]);
        }
    }
    let database_message_uids: HashSet<u32> = get_reports_by_mailbox(app_handle, 1)?
        .iter()
        .map(|r| r.mailbox_message_id as u32)
        .collect();

    let uuids_to_process: Vec<_> = importers_by_message_uid
        .keys()
        .filter(|&u| {
            // IMAP will always return the last message, even if it outside the UID range.
            // https://stackoverflow.com/questions/34706633/imap-search-by-a-uid-range-on-exchange-server-seems-to-be-broken
            if let MailboxCursor::Uid { last_seen_uid, .. } = mailbox.cursor {
                if *u <= (last_seen_uid as u32) {
                    return false;
                }
            }
            if database_message_uids.contains(u) {
                return false;
            }
            return true;
        })
        .collect();

    for &u in uuids_to_process.iter() {
        let Some(message_importer_ids) = importers_by_message_uid.get(&u) else {
            continue;
        };
        if let Err(e) = process_email_message(
            *u,
            message_importer_ids,
            &mailbox,
            &importers,
            job_id,
            job_store_mutex,
            &mut imap_session,
            app_handle,
        )
        .await
        {
            job_store_mutex.lock().await.add_message(
                job_id,
                JobMessage::Error {
                    message: e.to_string(),
                },
            );
        };
    }
    job_store_mutex.lock().await.add_message(
        job_id,
        JobMessage::Success {
            message: format!("Processed {} emails", uuids_to_process.len()),
        },
    );

    let technical_conf = get_technical_conf(app_handle)?;
    let taxpayer_profile = get_taxpayer_profile(app_handle)?;

    // Process reports
    let unprocessed_reports: Vec<_> = get_reports_by_mailbox(app_handle, 1)?
        .into_iter()
        .filter(|r| r.status != "processed")
        .collect();

    let mut processed_reports_counter = 0;
    let mut processed_passive_incomes_counter = 0;
    for report in unprocessed_reports.iter() {
        let report_parser: Box<dyn ReportParser> = match report._type.as_str() {
            "NativeIncomeJson" => Box::new(TrivialReportParser::new()),
            "IbkrCsv" => Box::new(IbkrReportParser::new()),
            _ => {
                continue;
            }
        };
        let report_path = get_report_path(app_handle, report.id)?;
        let parse_result = report_parser.parse(report_path);
        drop(report_parser);
        match parse_result {
            Err(e) => {
                job_store_mutex.lock().await.add_message(
                    job_id,
                    JobMessage::Error {
                        message: e.to_string(),
                    },
                );
                continue;
            }
            Ok(parsed_report) => {
                let filing_infos = parsed_report.get_filing_infos().await?;
                for filing_info in filing_infos {
                    let payment_notes = importers
                        .iter()
                        .find(|im| Some(im.id) == report.importer_id)
                        .map(|im| im.payment_notes.clone())
                        .unwrap_or("".to_string());
                    let opo_data = OpoData::new(
                        &filing_info,
                        &payment_notes,
                        &taxpayer_profile,
                        &technical_conf.holiday_conf,
                    )?;
                    let opo_filing_content = opo_data.fill();
                    let filing_id = create_filing(
                        app_handle,
                        &Filing {
                            id: 0,
                            report_id: report.id,
                            _type: filing_info._type,
                            status: "init".to_string(),
                            paying_entity: filing_info.paying_entity,
                            filing_deadline: format_iso(&opo_data.filing_deadline),
                            tax_payable: filing_info.tax_payable_rsdc,
                            tax_payment_reference: "".to_string(),
                        },
                    )?;
                    save_filing_content(app_handle, filing_id, opo_filing_content.as_bytes())?;
                    processed_passive_incomes_counter += 1;
                }
                let mut updated_report = report.clone();
                updated_report.status = "processed".into();
                update_report(app_handle, &updated_report)?;
                processed_reports_counter += 1;
            }
        };
    }

    if processed_reports_counter > 0 {
        job_store_mutex.lock().await.add_message(
            job_id,
            JobMessage::Success {
                message: format!("Processed {processed_reports_counter} reports"),
            },
        );
    }
    if processed_passive_incomes_counter > 0 {
        job_store_mutex.lock().await.add_message(
            job_id,
            JobMessage::Success {
                message: format!("Processed {processed_passive_incomes_counter} passive incomes"),
            },
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_date_string_for_imap() {
        assert_eq!(
            format_date_string_for_imap("2025-01-02").unwrap(),
            "02-Jan-2025".to_string()
        );
        assert_eq!(
            format_date_string_for_imap("2025-10-22").unwrap(),
            "22-Oct-2025".to_string()
        );
        assert!(format_date_string_for_imap("bad format").is_err());
    }

    #[test]
    fn test_get_search_string() {
        assert_eq!(
            get_search_string(
                "abc",
                "def",
                &MailboxCursor::Date {
                    date_string: "2025-10-22".into()
                }
            )
            .unwrap(),
            "FROM \"abc\" SUBJECT \"def\" SINCE 22-Oct-2025".to_string()
        );
        assert_eq!(
            get_search_string(
                "abc",
                "def",
                &MailboxCursor::Uid {
                    last_seen_uid: 123,
                    last_seen_datetime: 1456000000000000
                }
            )
            .unwrap(),
            "FROM \"abc\" SUBJECT \"def\" UID 124:*".to_string()
        );
    }
}
