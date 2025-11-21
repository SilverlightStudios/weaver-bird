/// Scan a directory for resource packs (both .zip and uncompressed folders)
use crate::model::PackMeta;
use anyhow::Result;
use rayon::prelude::*;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use zip::ZipArchive;

enum PackEntry {
    Zip(PathBuf, String, u64), // path, name, size
    Dir(PathBuf, String),      // path, name
}

/// Scan a directory for resource packs (.zip files and uncompressed folders)
pub fn scan_packs(packs_dir: &str) -> Result<Vec<PackMeta>> {
    println!("[scan_packs] Starting PARALLEL scan of: {}", packs_dir);
    let path = Path::new(packs_dir);

    if !path.exists() {
        anyhow::bail!("Packs directory does not exist: {}", packs_dir);
    }

    if !path.is_dir() {
        anyhow::bail!("Path is not a directory: {}", packs_dir);
    }

    // First pass: collect all pack entries
    let mut pack_entries = Vec::new();

    println!("[scan_packs] Reading directory entries...");
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy().to_string();

        // Skip hidden files and non-pack folders
        if file_name_str.starts_with('.') {
            continue;
        }

        // Check for .zip files
        if entry_path.is_file() && entry_path.extension().map_or(false, |ext| ext == "zip") {
            if let Ok(metadata) = entry.metadata() {
                pack_entries.push(PackEntry::Zip(
                    entry_path.clone(),
                    file_name_str.clone(),
                    metadata.len(),
                ));
            }
        }

        // Check for uncompressed folders with pack.mcmeta
        if entry_path.is_dir() {
            let pack_mcmeta = entry_path.join("pack.mcmeta");
            if pack_mcmeta.exists() {
                pack_entries.push(PackEntry::Dir(entry_path, file_name_str));
            }
        }
    }

    println!(
        "[scan_packs] Found {} packs, extracting metadata in PARALLEL",
        pack_entries.len()
    );

    // Second pass: extract metadata in parallel
    let packs: Vec<PackMeta> = pack_entries
        .par_iter()
        .filter_map(|entry| match entry {
            PackEntry::Zip(entry_path, file_name_str, size) => {
                println!("[scan_packs] Processing ZIP: {}", file_name_str);
                let (description, icon_data) = extract_pack_metadata_from_zip(entry_path);

                Some(PackMeta {
                    id: file_name_str.clone(),
                    name: file_name_str.trim_end_matches(".zip").to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    size: *size,
                    is_zip: true,
                    description,
                    icon_data,
                })
            }
            PackEntry::Dir(entry_path, file_name_str) => {
                println!("[scan_packs] Processing directory: {}", file_name_str);
                let size = calculate_dir_size(entry_path);
                let (description, icon_data) = extract_pack_metadata_from_dir(entry_path);

                Some(PackMeta {
                    id: file_name_str.clone(),
                    name: file_name_str.clone(),
                    path: entry_path.to_string_lossy().to_string(),
                    size,
                    is_zip: false,
                    description,
                    icon_data,
                })
            }
        })
        .collect();

    // Sort packs by name for consistent ordering
    let mut sorted_packs = packs;
    sorted_packs.sort_by(|a, b| a.name.cmp(&b.name));

    println!("[scan_packs] Found {} packs total:", sorted_packs.len());
    for pack in &sorted_packs {
        println!("[scan_packs]   - {} (is_zip: {})", pack.name, pack.is_zip);
    }

    Ok(sorted_packs)
}

/// Calculate total size of a directory recursively
fn calculate_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

/// Extract description from pack.mcmeta and icon from pack.png in a ZIP file
fn extract_pack_metadata_from_zip(zip_path: &Path) -> (Option<String>, Option<String>) {
    let file = match fs::File::open(zip_path) {
        Ok(f) => f,
        Err(_) => return (None, None),
    };

    let mut archive = match ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return (None, None),
    };

    // Extract description from pack.mcmeta
    let description = extract_description_from_zip(&mut archive);

    // Extract icon from pack.png
    let icon_data = extract_icon_from_zip(&mut archive);

    (description, icon_data)
}

/// Extract description from pack.mcmeta in ZIP archive
fn extract_description_from_zip(archive: &mut ZipArchive<fs::File>) -> Option<String> {
    // Try to find pack.mcmeta
    let mut mcmeta_file = archive.by_name("pack.mcmeta").ok()?;

    let mut contents = String::new();
    mcmeta_file.read_to_string(&mut contents).ok()?;

    // Parse JSON and extract description
    let json: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let description = json
        .get("pack")?
        .get("description")?
        .as_str()
        .map(|s| s.to_string());

    description
}

/// Extract icon from pack.png in ZIP archive as base64
fn extract_icon_from_zip(archive: &mut ZipArchive<fs::File>) -> Option<String> {
    // Try to find pack.png
    let mut icon_file = archive.by_name("pack.png").ok()?;

    let mut buffer = Vec::new();
    icon_file.read_to_end(&mut buffer).ok()?;

    // Encode as base64
    use base64::{engine::general_purpose, Engine as _};
    Some(general_purpose::STANDARD.encode(&buffer))
}

/// Extract description and icon from an uncompressed directory
fn extract_pack_metadata_from_dir(dir_path: &Path) -> (Option<String>, Option<String>) {
    // Extract description from pack.mcmeta
    let description = extract_description_from_dir(dir_path);

    // Extract icon from pack.png
    let icon_data = extract_icon_from_dir(dir_path);

    (description, icon_data)
}

/// Extract description from pack.mcmeta in directory
fn extract_description_from_dir(dir_path: &Path) -> Option<String> {
    let mcmeta_path = dir_path.join("pack.mcmeta");
    let contents = fs::read_to_string(mcmeta_path).ok()?;

    // Parse JSON and extract description
    let json: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let description = json
        .get("pack")?
        .get("description")?
        .as_str()
        .map(|s| s.to_string());

    description
}

/// Extract icon from pack.png in directory as base64
fn extract_icon_from_dir(dir_path: &Path) -> Option<String> {
    let icon_path = dir_path.join("pack.png");
    let buffer = fs::read(icon_path).ok()?;

    // Encode as base64
    use base64::{engine::general_purpose, Engine as _};
    Some(general_purpose::STANDARD.encode(&buffer))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    #[test]
    fn test_scan_packs_nonexistent() {
        let result = scan_packs("/nonexistent/path");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("does not exist"));
    }

    #[test]
    fn test_scan_packs_not_a_directory() {
        // Create a temporary file
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_pack_scanner_file.txt");
        fs::write(&test_file, "test").expect("Failed to create test file");

        let result = scan_packs(test_file.to_str().unwrap());

        // Clean up
        fs::remove_file(&test_file).ok();

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not a directory"));
    }

    #[test]
    fn test_scan_packs_empty_directory() {
        // Create a temporary empty directory
        let temp_dir = std::env::temp_dir().join("test_empty_pack_dir");
        fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let result = scan_packs(temp_dir.to_str().unwrap());

        // Clean up
        fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        let packs = result.unwrap();
        assert_eq!(packs.len(), 0);
    }

    #[test]
    fn test_scan_packs_with_directory_pack() {
        // Create a temporary directory with a directory-based pack
        let temp_dir = std::env::temp_dir().join("test_pack_dir_with_packs");
        let pack_dir = temp_dir.join("test_pack");
        fs::create_dir_all(&pack_dir).expect("Failed to create test directory");

        // Create pack.mcmeta
        let mcmeta_path = pack_dir.join("pack.mcmeta");
        let mut mcmeta_file = fs::File::create(&mcmeta_path).expect("Failed to create pack.mcmeta");
        mcmeta_file
            .write_all(
                br#"{
            "pack": {
                "pack_format": 15,
                "description": "Test pack description"
            }
        }"#,
            )
            .expect("Failed to write pack.mcmeta");

        let result = scan_packs(temp_dir.to_str().unwrap());

        // Clean up
        fs::remove_file(&mcmeta_path).ok();
        fs::remove_dir(&pack_dir).ok();
        fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        let packs = result.unwrap();
        assert_eq!(packs.len(), 1);
        assert_eq!(packs[0].name, "test_pack");
        assert_eq!(packs[0].is_zip, false);
        assert_eq!(
            packs[0].description,
            Some("Test pack description".to_string())
        );
    }

    #[test]
    fn test_scan_packs_skips_hidden_files() {
        // Create a temporary directory with hidden files
        let temp_dir = std::env::temp_dir().join("test_pack_dir_hidden");
        let hidden_dir = temp_dir.join(".hidden_pack");
        fs::create_dir_all(&hidden_dir).expect("Failed to create test directory");

        // Create pack.mcmeta in hidden directory
        let mcmeta_path = hidden_dir.join("pack.mcmeta");
        let mut mcmeta_file = fs::File::create(&mcmeta_path).expect("Failed to create pack.mcmeta");
        mcmeta_file
            .write_all(
                br#"{
            "pack": {
                "pack_format": 15,
                "description": "Hidden pack"
            }
        }"#,
            )
            .expect("Failed to write pack.mcmeta");

        let result = scan_packs(temp_dir.to_str().unwrap());

        // Clean up
        fs::remove_file(&mcmeta_path).ok();
        fs::remove_dir(&hidden_dir).ok();
        fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        let packs = result.unwrap();
        // Hidden files/directories should be skipped
        assert_eq!(packs.len(), 0);
    }

    #[test]
    fn test_scan_packs_skips_directory_without_mcmeta() {
        // Create a temporary directory without pack.mcmeta
        let temp_dir = std::env::temp_dir().join("test_pack_dir_no_mcmeta");
        let pack_dir = temp_dir.join("not_a_pack");
        fs::create_dir_all(&pack_dir).expect("Failed to create test directory");

        let result = scan_packs(temp_dir.to_str().unwrap());

        // Clean up
        fs::remove_dir(&pack_dir).ok();
        fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        let packs = result.unwrap();
        assert_eq!(packs.len(), 0);
    }

    #[test]
    fn test_extract_description_from_dir_valid() {
        let temp_dir = std::env::temp_dir().join("test_extract_desc");
        fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let mcmeta_path = temp_dir.join("pack.mcmeta");
        let mut mcmeta_file = fs::File::create(&mcmeta_path).expect("Failed to create pack.mcmeta");
        mcmeta_file
            .write_all(
                br#"{
            "pack": {
                "pack_format": 15,
                "description": "My custom description"
            }
        }"#,
            )
            .expect("Failed to write pack.mcmeta");

        let description = extract_description_from_dir(&temp_dir);

        // Clean up
        fs::remove_file(&mcmeta_path).ok();
        fs::remove_dir(&temp_dir).ok();

        assert_eq!(description, Some("My custom description".to_string()));
    }

    #[test]
    fn test_extract_description_from_dir_missing() {
        let temp_dir = std::env::temp_dir().join("test_extract_desc_missing");
        fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let description = extract_description_from_dir(&temp_dir);

        // Clean up
        fs::remove_dir(&temp_dir).ok();

        assert_eq!(description, None);
    }

    #[test]
    fn test_extract_icon_from_dir_missing() {
        let temp_dir = std::env::temp_dir().join("test_extract_icon_missing");
        fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let icon_data = extract_icon_from_dir(&temp_dir);

        // Clean up
        fs::remove_dir(&temp_dir).ok();

        assert_eq!(icon_data, None);
    }

    #[test]
    fn test_calculate_dir_size() {
        let temp_dir = std::env::temp_dir().join("test_calc_size");
        fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        // Create a test file with known size
        let test_file = temp_dir.join("test.txt");
        fs::write(&test_file, "12345").expect("Failed to create test file");

        let size = calculate_dir_size(&temp_dir);

        // Clean up
        fs::remove_file(&test_file).ok();
        fs::remove_dir(&temp_dir).ok();

        // Should be at least 5 bytes (the content we wrote)
        assert!(size >= 5);
    }
}
