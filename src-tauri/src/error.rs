use std::io;
use tauri::ipc::InvokeError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DkaError {
    #[error("I/O error {0}")]
    Io(#[from] io::Error),
    #[error("Generic: {0}")]
    Generic(String),
    #[error("User: {0}")]
    User(String),
    #[error("Tauri: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("Rusqlite: {0}")]
    Sql(#[from] rusqlite::Error),
    #[error("Imap: {0}")]
    Imap(#[from] imap::Error),
}
impl DkaError {
    pub fn generic(s: impl ToString) -> Self {
        Self::Generic(s.to_string())
    }
    pub fn user(s: impl ToString) -> Self {
        Self::User(s.to_string())
    }
}
impl Into<InvokeError> for DkaError {
    fn into(self) -> InvokeError {
        InvokeError::from_anyhow(self.into())
    }
}

pub type DkaResult<T> = Result<T, DkaError>;
