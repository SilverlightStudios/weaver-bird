/// Index assets from resource packs (both zip and uncompressed)
use crate::model::{AssetRecord, PackMeta};
use crate::util::zip;
use anyhow::Result;
use std::collections::HashMap;
use std::path::Path;
use walkdir::WalkDir;

const ASSET_PATH_PREFIX: &str = "assets/";
const TEXTURE_PATH: &str = "textures/";

/// Index all assets from a list of packs
pub fn index_assets(
    packs: &[PackMeta],
) -> Result<(Vec<AssetRecord>, HashMap<String, Vec<String>>)> {
    println!(
        "[index_assets] Starting asset indexing for {} packs",
        packs.len()
    );
    let mut assets_map: HashMap<String, AssetRecord> = HashMap::new();
    let mut providers: HashMap<String, Vec<String>> = HashMap::new();

    for (i, pack) in packs.iter().enumerate() {
        println!(
            "[index_assets] Indexing pack {}/{}: {} (is_zip: {})",
            i + 1,
            packs.len(),
            pack.name,
            pack.is_zip
        );
        let pack_assets = if pack.is_zip {
            index_zip_pack(&pack.path, &pack.id)?
        } else {
            index_folder_pack(&pack.path, &pack.id)?
        };
        println!("[index_assets] Found {} assets in pack", pack_assets.len());

        for (asset_id, files) in pack_assets {
            // Track provider
            providers
                .entry(asset_id.clone())
                .or_insert_with(Vec::new)
                .push(pack.id.clone());

            // Merge into assets map
            assets_map
                .entry(asset_id.clone())
                .and_modify(|record| {
                    for file in &files {
                        if !record.files.contains(file) {
                            record.files.push(file.clone());
                        }
                    }
                })
                .or_insert_with(|| AssetRecord {
                    id: asset_id.clone(),
                    labels: extract_labels(&asset_id),
                    files,
                });
        }
    }

    let mut assets: Vec<AssetRecord> = assets_map.into_values().collect();
    assets.sort_by(|a, b| a.id.cmp(&b.id));

    Ok((assets, providers))
}

/// Index assets from a zip pack
fn index_zip_pack(zip_path: &str, _pack_id: &str) -> Result<HashMap<String, Vec<String>>> {
    println!("[index_zip_pack] Listing files in ZIP: {}", zip_path);
    let files = zip::list_zip_files(zip_path)?;
    println!("[index_zip_pack] Found {} files in ZIP", files.len());

    // Debug: Print first few files to see their structure
    for (i, file) in files.iter().take(10).enumerate() {
        println!("[index_zip_pack] Sample file {}: {}", i, file);
    }

    // Debug: Show which files are being rejected and why
    let mut rejected_count = 0;
    for file in files.iter() {
        if extract_asset_id(&file).is_none() {
            if rejected_count < 5 {
                println!("[index_zip_pack] REJECTED (not a texture): {}", file);
            }
            rejected_count += 1;
        }
    }
    println!("[index_zip_pack] Total rejected files: {}", rejected_count);

    let mut assets_map: HashMap<String, Vec<String>> = HashMap::new();

    for (i, file) in files.iter().enumerate() {
        if i % 1000 == 0 {
            println!("[index_zip_pack] Processing file {}/{}", i, files.len());
        }
        if let Some(asset_id) = extract_asset_id(&file) {
            assets_map
                .entry(asset_id)
                .or_insert_with(Vec::new)
                .push(file.clone());
        }
    }
    println!(
        "[index_zip_pack] Extracted {} unique assets",
        assets_map.len()
    );

    Ok(assets_map)
}

/// Index assets from an uncompressed folder pack
fn index_folder_pack(folder_path: &str, _pack_id: &str) -> Result<HashMap<String, Vec<String>>> {
    let path = Path::new(folder_path);
    let mut assets_map: HashMap<String, Vec<String>> = HashMap::new();

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
    {
        let rel_path = entry
            .path()
            .strip_prefix(path)
            .map(|p| p.to_string_lossy().to_string())?;

        if let Some(asset_id) = extract_asset_id(&rel_path) {
            assets_map
                .entry(asset_id)
                .or_insert_with(Vec::new)
                .push(rel_path);
        }
    }

    Ok(assets_map)
}

/// Extract asset ID from a file path
/// E.g., "assets/minecraft/textures/block/stone.png" -> "minecraft:block/stone"
fn extract_asset_id(file_path: &str) -> Option<String> {
    // Must be in assets/
    if !file_path.starts_with(ASSET_PATH_PREFIX) {
        return None;
    }

    let after_assets = &file_path[ASSET_PATH_PREFIX.len()..];

    // Split namespace and rest
    let parts: Vec<&str> = after_assets.splitn(2, '/').collect();
    if parts.len() != 2 {
        return None;
    }

    let namespace = parts[0];
    let rest = parts[1];

    // For now, only index texture files in textures/ subdirectory
    if !rest.starts_with(TEXTURE_PATH) {
        return None;
    }

    let texture_path = &rest[TEXTURE_PATH.len()..];

    // Remove file extension
    let asset_path = if let Some(dot_idx) = texture_path.rfind('.') {
        &texture_path[..dot_idx]
    } else {
        texture_path
    };

    Some(format!("{}:{}", namespace, asset_path))
}

/// Extract labels from an asset ID
/// E.g., "minecraft:block/stone" -> ["minecraft", "block", "stone"]
fn extract_labels(asset_id: &str) -> Vec<String> {
    let mut labels = Vec::new();

    // Add namespace as label
    if let Some(colon_idx) = asset_id.find(':') {
        labels.push(asset_id[..colon_idx].to_string());
    }

    // Add path components as labels
    let path_part = if let Some(colon_idx) = asset_id.find(':') {
        &asset_id[colon_idx + 1..]
    } else {
        asset_id
    };

    for component in path_part.split('/') {
        if !component.is_empty() {
            labels.push(component.to_string());
        }
    }

    labels
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_asset_id() {
        assert_eq!(
            extract_asset_id("assets/minecraft/textures/block/stone.png"),
            Some("minecraft:block/stone".to_string())
        );

        assert_eq!(
            extract_asset_id("assets/minecraft/textures/entity/zombie.png"),
            Some("minecraft:entity/zombie".to_string())
        );

        assert_eq!(extract_asset_id("pack.mcmeta"), None);
        assert_eq!(extract_asset_id("assets/minecraft/lang/en_us.json"), None);
    }

    #[test]
    fn test_extract_asset_id_custom_namespace() {
        assert_eq!(
            extract_asset_id("assets/custom/textures/block/custom_block.png"),
            Some("custom:block/custom_block".to_string())
        );

        assert_eq!(
            extract_asset_id("assets/mymod/textures/item/tool.png"),
            Some("mymod:item/tool".to_string())
        );
    }

    #[test]
    fn test_extract_asset_id_nested_paths() {
        assert_eq!(
            extract_asset_id("assets/minecraft/textures/block/variants/stone_variant.png"),
            Some("minecraft:block/variants/stone_variant".to_string())
        );
    }

    #[test]
    fn test_extract_asset_id_different_extensions() {
        assert_eq!(
            extract_asset_id("assets/minecraft/textures/block/stone.jpg"),
            Some("minecraft:block/stone".to_string())
        );

        assert_eq!(
            extract_asset_id("assets/minecraft/textures/block/stone"),
            Some("minecraft:block/stone".to_string())
        );
    }

    #[test]
    fn test_extract_asset_id_invalid_paths() {
        // No assets/ prefix
        assert_eq!(extract_asset_id("minecraft/textures/block/stone.png"), None);

        // Missing namespace
        assert_eq!(extract_asset_id("assets/"), None);
        assert_eq!(extract_asset_id("assets"), None);

        // Not a texture file
        assert_eq!(extract_asset_id("assets/minecraft/models/block/stone.json"), None);
        assert_eq!(extract_asset_id("assets/minecraft/sounds/ambient.ogg"), None);
    }

    #[test]
    fn test_extract_labels() {
        let labels = extract_labels("minecraft:block/stone");
        assert_eq!(labels.len(), 3);
        assert!(labels.contains(&"minecraft".to_string()));
        assert!(labels.contains(&"block".to_string()));
        assert!(labels.contains(&"stone".to_string()));
    }

    #[test]
    fn test_extract_labels_nested() {
        let labels = extract_labels("minecraft:block/variants/stone");
        assert_eq!(labels.len(), 4);
        assert!(labels.contains(&"minecraft".to_string()));
        assert!(labels.contains(&"block".to_string()));
        assert!(labels.contains(&"variants".to_string()));
        assert!(labels.contains(&"stone".to_string()));
    }

    #[test]
    fn test_extract_labels_custom_namespace() {
        let labels = extract_labels("mymod:item/sword");
        assert_eq!(labels.len(), 3);
        assert!(labels.contains(&"mymod".to_string()));
        assert!(labels.contains(&"item".to_string()));
        assert!(labels.contains(&"sword".to_string()));
    }

    #[test]
    fn test_extract_labels_no_namespace() {
        let labels = extract_labels("block/stone");
        assert_eq!(labels.len(), 2);
        assert!(labels.contains(&"block".to_string()));
        assert!(labels.contains(&"stone".to_string()));
    }

    #[test]
    fn test_index_assets_empty_list() {
        let packs: Vec<PackMeta> = vec![];
        let result = index_assets(&packs);
        assert!(result.is_ok());
        let (assets, providers) = result.unwrap();
        assert_eq!(assets.len(), 0);
        assert_eq!(providers.len(), 0);
    }

    #[test]
    fn test_index_assets_single_pack() {
        // Create a temporary test pack directory
        let temp_dir = std::env::temp_dir().join("test_asset_index_single");
        let pack_dir = temp_dir.join("test_pack");
        let asset_dir = pack_dir.join("assets/minecraft/textures/block");
        std::fs::create_dir_all(&asset_dir).expect("Failed to create test directory");

        // Create test texture files
        std::fs::write(asset_dir.join("stone.png"), "fake png data").expect("Failed to create test file");
        std::fs::write(asset_dir.join("dirt.png"), "fake png data").expect("Failed to create test file");

        let pack = PackMeta {
            id: "test_pack".to_string(),
            name: "Test Pack".to_string(),
            path: pack_dir.to_string_lossy().to_string(),
            size: 1000,
            is_zip: false,
            description: None,
            icon_data: None,
        };

        let result = index_assets(&[pack]);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        let (assets, providers) = result.unwrap();
        assert_eq!(assets.len(), 2);

        // Find stone asset
        let stone_asset = assets.iter().find(|a| a.id == "minecraft:block/stone");
        assert!(stone_asset.is_some());
        let stone_asset = stone_asset.unwrap();
        assert!(stone_asset.labels.contains(&"minecraft".to_string()));
        assert!(stone_asset.labels.contains(&"block".to_string()));
        assert!(stone_asset.labels.contains(&"stone".to_string()));

        // Check providers
        assert!(providers.contains_key("minecraft:block/stone"));
        assert_eq!(providers["minecraft:block/stone"], vec!["test_pack"]);
    }

    #[test]
    fn test_index_assets_multiple_packs_same_asset() {
        // Create two temporary test pack directories with the same asset
        let temp_dir = std::env::temp_dir().join("test_asset_index_multi");
        let pack1_dir = temp_dir.join("pack1");
        let pack2_dir = temp_dir.join("pack2");
        let asset_dir1 = pack1_dir.join("assets/minecraft/textures/block");
        let asset_dir2 = pack2_dir.join("assets/minecraft/textures/block");
        std::fs::create_dir_all(&asset_dir1).expect("Failed to create test directory");
        std::fs::create_dir_all(&asset_dir2).expect("Failed to create test directory");

        // Create the same texture file in both packs
        std::fs::write(asset_dir1.join("stone.png"), "pack1 version").expect("Failed to create test file");
        std::fs::write(asset_dir2.join("stone.png"), "pack2 version").expect("Failed to create test file");

        let pack1 = PackMeta {
            id: "pack1".to_string(),
            name: "Pack 1".to_string(),
            path: pack1_dir.to_string_lossy().to_string(),
            size: 1000,
            is_zip: false,
            description: None,
            icon_data: None,
        };

        let pack2 = PackMeta {
            id: "pack2".to_string(),
            name: "Pack 2".to_string(),
            path: pack2_dir.to_string_lossy().to_string(),
            size: 1000,
            is_zip: false,
            description: None,
            icon_data: None,
        };

        let result = index_assets(&[pack1, pack2]);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        let (assets, providers) = result.unwrap();

        // Should have one asset with multiple providers
        assert_eq!(assets.len(), 1);
        let stone_asset = &assets[0];
        assert_eq!(stone_asset.id, "minecraft:block/stone");

        // Check providers
        assert!(providers.contains_key("minecraft:block/stone"));
        let stone_providers = &providers["minecraft:block/stone"];
        assert_eq!(stone_providers.len(), 2);
        assert!(stone_providers.contains(&"pack1".to_string()));
        assert!(stone_providers.contains(&"pack2".to_string()));
    }

    #[test]
    fn test_index_assets_sorted_output() {
        let temp_dir = std::env::temp_dir().join("test_asset_index_sorted");
        let pack_dir = temp_dir.join("test_pack");
        let asset_dir = pack_dir.join("assets/minecraft/textures/block");
        std::fs::create_dir_all(&asset_dir).expect("Failed to create test directory");

        // Create files in non-alphabetical order
        std::fs::write(asset_dir.join("zebra.png"), "fake").expect("Failed to create test file");
        std::fs::write(asset_dir.join("apple.png"), "fake").expect("Failed to create test file");
        std::fs::write(asset_dir.join("monkey.png"), "fake").expect("Failed to create test file");

        let pack = PackMeta {
            id: "test_pack".to_string(),
            name: "Test Pack".to_string(),
            path: pack_dir.to_string_lossy().to_string(),
            size: 1000,
            is_zip: false,
            description: None,
            icon_data: None,
        };

        let result = index_assets(&[pack]);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        let (assets, _) = result.unwrap();
        assert_eq!(assets.len(), 3);

        // Assets should be sorted alphabetically by ID
        assert_eq!(assets[0].id, "minecraft:block/apple");
        assert_eq!(assets[1].id, "minecraft:block/monkey");
        assert_eq!(assets[2].id, "minecraft:block/zebra");
    }
}
