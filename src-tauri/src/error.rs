/**
 * Application error type for Tauri commands
 *
 * This implements the modern Tauri v2 pattern of custom error types
 * that automatically serialize to JSON for frontend consumption.
 */

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    /// Create a validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "VALIDATION_ERROR".to_string(),
            message: message.into(),
            details: None,
        }
    }

    /// Create a filesystem error
    pub fn io(message: impl Into<String>) -> Self {
        Self {
            code: "IO_ERROR".to_string(),
            message: message.into(),
            details: None,
        }
    }

    /// Create a pack scanning error
    pub fn scan(message: impl Into<String>) -> Self {
        Self {
            code: "SCAN_ERROR".to_string(),
            message: message.into(),
            details: None,
        }
    }

    /// Create a pack building error
    pub fn build(message: impl Into<String>) -> Self {
        Self {
            code: "BUILD_ERROR".to_string(),
            message: message.into(),
            details: None,
        }
    }

    /// Create an internal error
    pub fn internal(message: impl Into<String>, details: impl Into<String>) -> Self {
        Self {
            code: "INTERNAL_ERROR".to_string(),
            message: message.into(),
            details: Some(details.into()),
        }
    }

    /// Attach more context to the error
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::internal("Operation failed", err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::internal("Serialization failed", err.to_string())
    }
}

/// Type alias for Results in this application
pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error() {
        let err = AppError::validation("test validation error");
        assert_eq!(err.code, "VALIDATION_ERROR");
        assert_eq!(err.message, "test validation error");
        assert_eq!(err.details, None);
    }

    #[test]
    fn test_io_error() {
        let err = AppError::io("test io error");
        assert_eq!(err.code, "IO_ERROR");
        assert_eq!(err.message, "test io error");
        assert_eq!(err.details, None);
    }

    #[test]
    fn test_scan_error() {
        let err = AppError::scan("test scan error");
        assert_eq!(err.code, "SCAN_ERROR");
        assert_eq!(err.message, "test scan error");
        assert_eq!(err.details, None);
    }

    #[test]
    fn test_build_error() {
        let err = AppError::build("test build error");
        assert_eq!(err.code, "BUILD_ERROR");
        assert_eq!(err.message, "test build error");
        assert_eq!(err.details, None);
    }

    #[test]
    fn test_internal_error() {
        let err = AppError::internal("operation failed", "detailed info");
        assert_eq!(err.code, "INTERNAL_ERROR");
        assert_eq!(err.message, "operation failed");
        assert_eq!(err.details, Some("detailed info".to_string()));
    }

    #[test]
    fn test_with_details() {
        let err = AppError::validation("test error").with_details("additional context");
        assert_eq!(err.code, "VALIDATION_ERROR");
        assert_eq!(err.message, "test error");
        assert_eq!(err.details, Some("additional context".to_string()));
    }

    #[test]
    fn test_display() {
        let err = AppError::validation("test message");
        assert_eq!(err.to_string(), "VALIDATION_ERROR: test message");
    }

    #[test]
    fn test_from_std_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_err: AppError = io_err.into();
        assert_eq!(app_err.code, "IO_ERROR");
        assert!(app_err.message.contains("file not found"));
    }

    #[test]
    fn test_from_serde_json_error() {
        let json_err = serde_json::from_str::<serde_json::Value>("invalid json").unwrap_err();
        let app_err: AppError = json_err.into();
        assert_eq!(app_err.code, "INTERNAL_ERROR");
        assert_eq!(app_err.message, "Serialization failed");
        assert!(app_err.details.is_some());
    }

    #[test]
    fn test_from_anyhow_error() {
        let anyhow_err = anyhow::anyhow!("something went wrong");
        let app_err: AppError = anyhow_err.into();
        assert_eq!(app_err.code, "INTERNAL_ERROR");
        assert_eq!(app_err.message, "Operation failed");
        assert_eq!(app_err.details, Some("something went wrong".to_string()));
    }

    #[test]
    fn test_error_serialization() {
        let err = AppError::validation("test error").with_details("test details");
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"code\":\"VALIDATION_ERROR\""));
        assert!(json.contains("\"message\":\"test error\""));
        assert!(json.contains("\"details\":\"test details\""));
    }

    #[test]
    fn test_error_deserialization() {
        let json = r#"{"code":"IO_ERROR","message":"test message","details":"test details"}"#;
        let err: AppError = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(err.code, "IO_ERROR");
        assert_eq!(err.message, "test message");
        assert_eq!(err.details, Some("test details".to_string()));
    }

    #[test]
    fn test_error_clone() {
        let err1 = AppError::scan("test error");
        let err2 = err1.clone();
        assert_eq!(err1.code, err2.code);
        assert_eq!(err1.message, err2.message);
        assert_eq!(err1.details, err2.details);
    }
}
