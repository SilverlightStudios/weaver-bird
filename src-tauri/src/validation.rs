use crate::error::AppResult;
/**
 * Input validation utilities for Tauri commands
 *
 * Provides a DRY way to validate all command inputs before processing.
 * Enables centralized, reusable validation logic.
 */
use std::path::Path;

/// Validates a directory path exists and is readable
pub fn validate_directory(path: &str, label: &str) -> AppResult<()> {
    if path.is_empty() {
        return Err(crate::error::AppError::validation(format!(
            "{} cannot be empty",
            label
        )));
    }

    let p = Path::new(path);
    if !p.exists() {
        return Err(crate::error::AppError::io(format!(
            "{} does not exist: {}",
            label, path
        )));
    }

    if !p.is_dir() {
        return Err(crate::error::AppError::validation(format!(
            "{} is not a directory: {}",
            label, path
        )));
    }

    Ok(())
}

/// Validates that a pack order is not empty
pub fn validate_pack_order(order: &[String]) -> AppResult<()> {
    if order.is_empty() {
        return Err(crate::error::AppError::validation(
            "Pack order cannot be empty".to_string(),
        ));
    }
    Ok(())
}

/// Validates that all pack IDs in overrides are present in pack order
pub fn validate_overrides(
    overrides: &std::collections::HashMap<String, crate::model::OverrideSelection>,
    pack_order: &[String],
) -> AppResult<()> {
    for (asset_id, override_entry) in overrides {
        if asset_id.is_empty() {
            return Err(crate::error::AppError::validation(
                "Asset ID in overrides cannot be empty".to_string(),
            ));
        }
        let pack_id = &override_entry.pack_id;
        if pack_id.is_empty() {
            return Err(crate::error::AppError::validation(format!(
                "Pack ID for asset {} cannot be empty",
                asset_id
            )));
        }
        if !pack_order.contains(pack_id) {
            return Err(crate::error::AppError::validation(format!(
                "Override references non-existent pack: {}",
                pack_id
            )));
        }
        if let Some(path) = &override_entry.variant_path {
            if path.trim().is_empty() {
                return Err(crate::error::AppError::validation(format!(
                    "Variant path for asset {} cannot be empty",
                    asset_id
                )));
            }
        }
    }
    Ok(())
}

/// Validates build request parameters
pub fn validate_build_request(
    packs_dir: &str,
    pack_order: &[String],
    overrides: &std::collections::HashMap<String, crate::model::OverrideSelection>,
    output_dir: &str,
) -> AppResult<()> {
    validate_directory(packs_dir, "Packs directory")?;
    validate_directory(output_dir, "Output directory")?;
    validate_pack_order(pack_order)?;
    validate_overrides(overrides, pack_order)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_validate_directory_empty_path() {
        let result = validate_directory("", "Test directory");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "VALIDATION_ERROR");
        assert!(err.message.contains("cannot be empty"));
    }

    #[test]
    fn test_validate_directory_nonexistent() {
        let result = validate_directory("/nonexistent/path/12345", "Test directory");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "IO_ERROR");
        assert!(err.message.contains("does not exist"));
    }

    #[test]
    fn test_validate_directory_not_a_directory() {
        // Create a temporary file
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_validation_file.txt");
        fs::write(&test_file, "test").expect("Failed to create test file");

        let result = validate_directory(test_file.to_str().unwrap(), "Test directory");

        // Clean up
        fs::remove_file(&test_file).ok();

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "VALIDATION_ERROR");
        assert!(err.message.contains("not a directory"));
    }

    #[test]
    fn test_validate_directory_valid() {
        let temp_dir = std::env::temp_dir();
        let result = validate_directory(temp_dir.to_str().unwrap(), "Test directory");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_pack_order_empty() {
        let result = validate_pack_order(&[]);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "VALIDATION_ERROR");
        assert!(err.message.contains("Pack order cannot be empty"));
    }

    #[test]
    fn test_validate_pack_order_valid() {
        let order = vec!["pack1".to_string(), "pack2".to_string()];
        let result = validate_pack_order(&order);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_pack_order_single_pack() {
        let order = vec!["pack1".to_string()];
        let result = validate_pack_order(&order);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_overrides_empty_asset_id() {
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "".to_string(),
            crate::model::OverrideSelection {
                pack_id: "pack1".to_string(),
                variant_path: None,
            },
        );
        let pack_order = vec!["pack1".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Asset ID"));
        assert!(err.message.contains("cannot be empty"));
    }

    #[test]
    fn test_validate_overrides_empty_pack_id() {
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "minecraft:block/stone".to_string(),
            crate::model::OverrideSelection {
                pack_id: "".to_string(),
                variant_path: None,
            },
        );
        let pack_order = vec!["pack1".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Pack ID"));
        assert!(err.message.contains("cannot be empty"));
    }

    #[test]
    fn test_validate_overrides_nonexistent_pack() {
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "minecraft:block/stone".to_string(),
            crate::model::OverrideSelection {
                pack_id: "nonexistent_pack".to_string(),
                variant_path: None,
            },
        );
        let pack_order = vec!["pack1".to_string(), "pack2".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("non-existent pack"));
        assert!(err.message.contains("nonexistent_pack"));
    }

    #[test]
    fn test_validate_overrides_empty_variant_path() {
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "minecraft:block/stone".to_string(),
            crate::model::OverrideSelection {
                pack_id: "pack1".to_string(),
                variant_path: Some("   ".to_string()), // Only whitespace
            },
        );
        let pack_order = vec!["pack1".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Variant path"));
        assert!(err.message.contains("cannot be empty"));
    }

    #[test]
    fn test_validate_overrides_valid() {
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "minecraft:block/stone".to_string(),
            crate::model::OverrideSelection {
                pack_id: "pack1".to_string(),
                variant_path: Some("variant1".to_string()),
            },
        );
        overrides.insert(
            "minecraft:block/dirt".to_string(),
            crate::model::OverrideSelection {
                pack_id: "pack2".to_string(),
                variant_path: None,
            },
        );
        let pack_order = vec!["pack1".to_string(), "pack2".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_overrides_empty_hashmap() {
        let overrides = std::collections::HashMap::new();
        let pack_order = vec!["pack1".to_string()];

        let result = validate_overrides(&overrides, &pack_order);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_build_request_valid() {
        let temp_dir = std::env::temp_dir();
        let packs_dir = temp_dir.to_str().unwrap();
        let output_dir = temp_dir.to_str().unwrap();
        let pack_order = vec!["pack1".to_string()];
        let overrides = std::collections::HashMap::new();

        let result = validate_build_request(packs_dir, &pack_order, &overrides, output_dir);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_build_request_invalid_packs_dir() {
        let temp_dir = std::env::temp_dir();
        let output_dir = temp_dir.to_str().unwrap();
        let pack_order = vec!["pack1".to_string()];
        let overrides = std::collections::HashMap::new();

        let result = validate_build_request(
            "/nonexistent/path",
            &pack_order,
            &overrides,
            output_dir,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_build_request_invalid_output_dir() {
        let temp_dir = std::env::temp_dir();
        let packs_dir = temp_dir.to_str().unwrap();
        let pack_order = vec!["pack1".to_string()];
        let overrides = std::collections::HashMap::new();

        let result = validate_build_request(
            packs_dir,
            &pack_order,
            &overrides,
            "/nonexistent/output",
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_build_request_empty_pack_order() {
        let temp_dir = std::env::temp_dir();
        let packs_dir = temp_dir.to_str().unwrap();
        let output_dir = temp_dir.to_str().unwrap();
        let pack_order = vec![];
        let overrides = std::collections::HashMap::new();

        let result = validate_build_request(packs_dir, &pack_order, &overrides, output_dir);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Pack order cannot be empty"));
    }

    #[test]
    fn test_validate_build_request_invalid_overrides() {
        let temp_dir = std::env::temp_dir();
        let packs_dir = temp_dir.to_str().unwrap();
        let output_dir = temp_dir.to_str().unwrap();
        let pack_order = vec!["pack1".to_string()];

        let mut overrides = std::collections::HashMap::new();
        overrides.insert(
            "minecraft:block/stone".to_string(),
            crate::model::OverrideSelection {
                pack_id: "nonexistent_pack".to_string(),
                variant_path: None,
            },
        );

        let result = validate_build_request(packs_dir, &pack_order, &overrides, output_dir);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("non-existent pack"));
    }
}
