use std::fs;
use std::fs::File;
use std::io::Read;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

use crate::error::DkaError;
use crate::error::DkaResult;
use crate::ipc_types::HolidayConf;
use crate::ipc_types::TechnicalConf;

pub fn migrate_filesystem(app_handle: &AppHandle) -> DkaResult<()> {
    let reports_dir = app_handle.path().app_data_dir()?.join("reports");
    std::fs::create_dir_all(reports_dir)?;
    let filings_dir = app_handle.path().app_data_dir()?.join("filings");
    std::fs::create_dir_all(filings_dir)?;
    match fs::exists(get_technical_conf_path(app_handle)?) {
        Ok(true) => {}
        _ => {
            update_technical_conf(app_handle, get_default_technical_conf())?;
        }
    };
    Ok(())
}

pub fn get_technical_conf_path(app_handle: &AppHandle) -> DkaResult<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir.join(PathBuf::from("technical-conf.json")))
}

pub fn get_technical_conf_temp_path(app_handle: &AppHandle) -> DkaResult<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir.join(PathBuf::from("technical-conf.json.tmp")))
}

pub fn get_filings_dir(app_handle: &AppHandle) -> DkaResult<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir.join(PathBuf::from("filings")))
}

pub fn get_reports_dir(app_handle: &AppHandle) -> DkaResult<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir.join(PathBuf::from("reports")))
}

pub fn get_technical_conf(app_handle: &AppHandle) -> DkaResult<TechnicalConf> {
    let mut file = File::open(get_technical_conf_path(app_handle)?)?;
    let mut file_content = String::new();
    file.read_to_string(&mut file_content)?;
    let conf: TechnicalConf = serde_json::from_str(&file_content)
        .map_err(|_| DkaError::generic("Failed to deserialize technical conf JSON"))?;
    Ok(conf)
}

pub fn get_db_path(app_handle: &AppHandle) -> DkaResult<PathBuf> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    Ok(app_data_dir.join(PathBuf::from("db.sqlite")))
}

pub fn update_technical_conf(
    app_handle: &AppHandle,
    technical_conf: TechnicalConf,
) -> DkaResult<()> {
    let temp_path = get_technical_conf_temp_path(app_handle)?;
    let final_path = get_technical_conf_path(app_handle)?;
    let mut file = File::create(&temp_path)?;
    let file_content = serde_json::to_string(&technical_conf).map_err(DkaError::generic)?;
    file.write_all(file_content.as_bytes())?;
    file.flush()?;
    std::fs::rename(temp_path, final_path)?;
    Ok(())
}

pub fn get_default_technical_conf() -> TechnicalConf {
    let holiday_conf: HolidayConf =
        serde_json::from_str(include_str!("../holiday-data.json")).unwrap();
    TechnicalConf { holiday_conf }
}

pub fn get_filing_content(app_handle: &AppHandle, filing_id: i32) -> DkaResult<Vec<u8>> {
    let path = get_filing_path(app_handle, filing_id)?;
    let mut file = File::open(path)?;
    let mut file_content: Vec<u8> = vec![];
    file.read_to_end(&mut file_content)?;
    Ok(file_content)
}

pub fn save_filing_content(
    app_handle: &AppHandle,
    filing_id: i32,
    filing_content: &[u8],
) -> DkaResult<()> {
    let mut file = File::create_new(get_filing_path(app_handle, filing_id)?)?;
    file.write_all(filing_content)?;
    Ok(())
}

pub fn get_report_path(app_handle: &AppHandle, report_id: i32) -> DkaResult<PathBuf> {
    Ok(get_reports_dir(app_handle)?.join(PathBuf::from(format!("{}.csv", report_id))))
}

pub fn get_filing_path(app_handle: &AppHandle, filing_id: i32) -> DkaResult<PathBuf> {
    Ok(get_filings_dir(app_handle)?.join(PathBuf::from(format!("{}.xml", filing_id))))
}

pub fn get_report_content(app_handle: &AppHandle, report_id: i32) -> DkaResult<Vec<u8>> {
    let mut file = File::open(get_report_path(app_handle, report_id)?)?;
    let mut file_content: Vec<u8> = vec![];
    file.read_to_end(&mut file_content)?;
    Ok(file_content)
}

pub fn save_report_content(
    app_handle: &AppHandle,
    report_id: i32,
    report_content: &[u8],
) -> DkaResult<()> {
    let mut file = File::create_new(get_report_path(app_handle, report_id)?)?;
    file.write_all(report_content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::filesystem::get_default_technical_conf;
    #[test]
    fn test_technical_conf_smoke() {
        let technical_conf = get_default_technical_conf();
        assert!(technical_conf
            .holiday_conf
            .holidays
            .contains(&"2027-01-01".to_string()))
    }
}

// TODO: "unit test" to write technical conf to file
