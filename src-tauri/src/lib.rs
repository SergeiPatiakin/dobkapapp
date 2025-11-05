use crate::ipc_handlers::{
    cancel_job, create_importer, create_job, delete_filing, delete_importer, delete_report,
    export_filing, export_report, get_filings, get_importers, get_job, get_mailbox, get_reports,
    get_taxpayer_profile, get_technical_conf, import_holiday_conf, import_trivial_report,
    update_filing, update_importer, update_mailbox, update_taxpayer_profile, update_technical_conf,
};

mod database;
mod date;
mod error;
mod exchange_rate;
mod filesystem;
mod ibkr_report_parser;
mod income_tax;
mod ipc_handlers;
mod ipc_types;
mod job_logic;
mod job_store;
mod opo_data;
mod report_parser;
mod trivial_report_parser;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_technical_conf,
            update_technical_conf,
            import_holiday_conf,
            get_mailbox,
            update_mailbox,
            get_taxpayer_profile,
            update_taxpayer_profile,
            get_importers,
            update_importer,
            create_importer,
            delete_importer,
            get_reports,
            delete_report,
            export_report,
            import_trivial_report,
            get_filings,
            update_filing,
            delete_filing,
            export_filing,
            create_job,
            get_job,
            cancel_job,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
