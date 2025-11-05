use std::io::{Read, Write};
use std::{fs::File, sync::OnceLock};

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};
use tokio::sync::Mutex;

use crate::database::{create_report, migrate_database};
use crate::error::{DkaError, DkaResult};
use crate::filesystem::{get_filing_content, get_report_content, save_report_content};
use crate::ipc_types::{Filing, Importer, Job, JobMessage, Report, TaxpayerProfile};
use crate::job_logic::run_job;
use crate::job_store::JobStore;
use crate::{
    filesystem::migrate_filesystem,
    ipc_types::{HolidayConf, Mailbox, TechnicalConf},
};
use lazy_static::lazy_static;

fn migrate_app(app_handle: &AppHandle) -> DkaResult<()> {
    migrate_filesystem(app_handle)?;
    migrate_database(app_handle)?;
    rustls::crypto::CryptoProvider::install_default(rustls::crypto::ring::default_provider())
        .unwrap();
    Ok(())
}

static INIT_LOCK: OnceLock<Option<DkaError>> = OnceLock::new();
fn ensure_app_migrated(app_handle: &AppHandle) -> DkaResult<()> {
    let err = INIT_LOCK.get_or_init(|| migrate_app(app_handle).err());
    match err {
        None => Ok(()),
        Some(e) => Err(DkaError::Generic(format!(
            "Error during initialization: {}",
            e.to_string()
        ))),
    }
}

lazy_static! {
    static ref JOB_STORE: Mutex<JobStore> = Mutex::new(JobStore::new());
}

#[tauri::command]
pub fn get_technical_conf(app_handle: AppHandle) -> DkaResult<TechnicalConf> {
    ensure_app_migrated(&app_handle)?;
    crate::filesystem::get_technical_conf(&app_handle)
}

#[tauri::command]
pub fn update_technical_conf(
    app_handle: AppHandle,
    technical_conf: TechnicalConf,
) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::filesystem::update_technical_conf(&app_handle, technical_conf)
}

#[tauri::command]
pub fn get_mailbox(app_handle: AppHandle) -> DkaResult<Mailbox> {
    ensure_app_migrated(&app_handle)?;
    crate::database::get_mailbox(&app_handle)
}

#[tauri::command]
pub fn update_mailbox(app_handle: AppHandle, mailbox: Mailbox) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::update_mailbox(&app_handle, &mailbox)
}

#[tauri::command]
pub async fn import_holiday_conf(app_handle: AppHandle) -> DkaResult<HolidayConf> {
    ensure_app_migrated(&app_handle)?;
    let file_path = app_handle.dialog().file().blocking_pick_file();
    let Some(file_path) = file_path.clone() else {
        return Err(DkaError::user("No file chosen"));
    };
    let FilePath::Path(file_path) = file_path else {
        return Err(DkaError::user("Only file paths are supported"));
    };
    let mut file_content = String::new();
    let mut f = File::open(file_path).map_err(DkaError::Io)?;
    f.read_to_string(&mut file_content).map_err(DkaError::Io)?;
    serde_json::from_str(&file_content).map_err(DkaError::generic)
}

#[tauri::command]
pub fn get_taxpayer_profile(app_handle: AppHandle) -> DkaResult<TaxpayerProfile> {
    ensure_app_migrated(&app_handle)?;
    crate::database::get_taxpayer_profile(&app_handle)
}

#[tauri::command]
pub fn update_taxpayer_profile(
    app_handle: AppHandle,
    taxpayer_profile: TaxpayerProfile,
) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::update_taxpayer_profile(&app_handle, &taxpayer_profile)
}

#[tauri::command]
pub fn get_importers(app_handle: AppHandle) -> DkaResult<Vec<Importer>> {
    ensure_app_migrated(&app_handle)?;
    crate::database::get_importers(&app_handle)
}

#[tauri::command]
pub fn update_importer(app_handle: AppHandle, importer: Importer) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::update_importer(&app_handle, &importer)
}

#[tauri::command]
pub fn create_importer(app_handle: AppHandle, importer: Importer) -> DkaResult<i32> {
    ensure_app_migrated(&app_handle)?;
    crate::database::create_importer(&app_handle, &importer)
}

#[tauri::command]
pub fn delete_importer(app_handle: AppHandle, importer_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::delete_importer(&app_handle, importer_id)
}

#[tauri::command]
pub async fn import_trivial_report(app_handle: AppHandle, report_content: String) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    let report = Report {
        id: 0,
        _type: "NativeIncomeJson".into(),
        importer_id: None,
        mailbox_id: 1,         // Should really be NULL
        mailbox_message_id: 0, // Should really be NULL
        report_name: "Manual report".into(),
        status: "init".into(),
    };
    let report_id = create_report(&app_handle, &report)?;
    let report_content: Vec<u8> = report_content.into_bytes().to_vec();
    save_report_content(&app_handle, report_id, &report_content)?;
    Ok(())
}

#[tauri::command]
pub fn get_reports(app_handle: AppHandle) -> DkaResult<Vec<Report>> {
    ensure_app_migrated(&app_handle)?;
    crate::database::get_reports_by_mailbox(&app_handle, 1).map(|mut v| {
        v.reverse();
        v
    })
}

#[tauri::command]
pub fn delete_report(app_handle: AppHandle, report_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::delete_report(&app_handle, report_id)
}

#[tauri::command]
pub async fn export_report(app_handle: AppHandle, report_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    let save_path = app_handle
        .dialog()
        .file()
        .set_file_name(format!("{}.csv", report_id))
        .blocking_save_file();
    let Some(save_path) = save_path.clone() else {
        return Err(DkaError::user("No file path chosen"));
    };
    let FilePath::Path(save_path) = save_path else {
        return Err(DkaError::user("Only file paths are supported"));
    };
    let report_content = get_report_content(&app_handle, report_id)?;
    let mut file = File::create_new(save_path).map_err(DkaError::Io)?;
    file.write_all(&report_content).map_err(DkaError::Io)?;
    file.flush().map_err(DkaError::Io)?;
    Ok(())
}

#[tauri::command]
pub fn get_filings(app_handle: AppHandle) -> DkaResult<Vec<Filing>> {
    ensure_app_migrated(&app_handle)?;
    crate::database::get_filings(&app_handle)
}

#[tauri::command]
pub fn update_filing(app_handle: AppHandle, filing: Filing) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::update_filing(&app_handle, &filing)
}

#[tauri::command]
pub fn delete_filing(app_handle: AppHandle, filing_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    crate::database::delete_filing(&app_handle, filing_id)
}

#[tauri::command]
pub async fn export_filing(app_handle: AppHandle, filing_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    let save_path = app_handle
        .dialog()
        .file()
        .set_file_name(format!("{}.xml", filing_id))
        .blocking_save_file();
    let Some(save_path) = save_path.clone() else {
        return Err(DkaError::user("No file path chosen"));
    };
    let FilePath::Path(save_path) = save_path else {
        return Err(DkaError::user("Only file paths are supported"));
    };
    let filing_content = get_filing_content(&app_handle, filing_id)?;
    let mut file = File::create_new(save_path).map_err(DkaError::Io)?;
    file.write_all(&filing_content).map_err(DkaError::Io)?;
    file.flush().map_err(DkaError::Io)?;
    Ok(())
}

#[tauri::command]
pub async fn get_job(app_handle: AppHandle, job_id: i32) -> DkaResult<Option<Job>> {
    ensure_app_migrated(&app_handle)?;
    let job_store = JOB_STORE.lock().await;
    Ok(job_store.get(job_id))
}

#[tauri::command]
pub async fn create_job(app_handle: AppHandle) -> DkaResult<i32> {
    ensure_app_migrated(&app_handle)?;
    let mut job_store_guard = JOB_STORE.lock().await;
    let job_id = job_store_guard.create();
    // Fire and forget the job
    tokio::spawn(async move {
        match run_job(job_id, &JOB_STORE, &app_handle).await {
            Err(e) => {
                let mut job_store_guard = JOB_STORE.lock().await;
                job_store_guard.add_message(
                    job_id,
                    JobMessage::Error {
                        message: e.to_string(),
                    },
                );
                job_store_guard.set_completed(job_id);
            }
            Ok(_) => {
                let mut job_store_guard = JOB_STORE.lock().await;
                job_store_guard.set_completed(job_id);
            }
        }
    });
    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_job(app_handle: AppHandle, job_id: i32) -> DkaResult<()> {
    ensure_app_migrated(&app_handle)?;
    let mut job_store = JOB_STORE.lock().await;
    job_store.cancel(job_id);
    Ok(())
}
