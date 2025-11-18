use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Metadata about a discovered resource pack
///
/// Either a zip file or directory containing pack.mcmeta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackMeta {
    /// Unique identifier for this pack
    pub id: String,
    /// Display name from pack.mcmeta
    pub name: String,
    /// Path to pack (zip file or directory)
    pub path: String,
    /// Total size in bytes
    pub size: u64,
    /// True if this is a zip file, false if directory
    pub is_zip: bool,
    /// Description from pack.mcmeta (may contain Minecraft color codes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Base64-encoded PNG icon data from pack.png
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_data: Option<String>,
}

/// A single asset (texture, model, config, etc.) with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRecord {
    /// Asset ID (e.g., "minecraft:block/stone")
    pub id: String,
    /// Searchable labels derived from asset ID
    pub labels: Vec<String>,
    /// File paths within packs that contain this asset
    pub files: Vec<String>,
}

/// Information about which pack provides an asset
///
/// Currently defined but not actively used
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub pack_id: String,
    pub file_map: HashMap<String, bool>,
}

/// Override selection payload for penciled assets
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverrideSelection {
    pub pack_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_path: Option<String>,
}

/// Result of scanning a resource packs directory
///
/// Contains all discovered packs and their assets
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanResult {
    /// All discovered resource packs
    pub packs: Vec<PackMeta>,
    /// All discovered assets across all packs
    pub assets: Vec<AssetRecord>,
    /// Mapping of asset IDs to the pack IDs that provide them
    pub providers: HashMap<String, Vec<String>>,
}

/// Progress tracking for long-running operations
///
/// Currently defined but not yet implemented
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Progress {
    pub phase: String,
    pub completed: u64,
    pub total: u64,
    pub bytes: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pack_meta_serialization() {
        let pack = PackMeta {
            id: "test_pack".to_string(),
            name: "Test Pack".to_string(),
            path: "/path/to/pack".to_string(),
            size: 1024,
            is_zip: false,
            description: Some("Test description".to_string()),
            icon_data: Some("base64_icon_data".to_string()),
        };

        let json = serde_json::to_string(&pack).expect("should serialize");
        let deserialized: PackMeta = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.id, "test_pack");
        assert_eq!(deserialized.name, "Test Pack");
        assert_eq!(deserialized.size, 1024);
        assert_eq!(deserialized.is_zip, false);
    }

    #[test]
    fn test_asset_record_serialization() {
        let asset = AssetRecord {
            id: "minecraft:block/stone".to_string(),
            labels: vec!["minecraft".to_string(), "block".to_string(), "stone".to_string()],
            files: vec!["assets/minecraft/textures/block/stone.png".to_string()],
        };

        let json = serde_json::to_string(&asset).expect("should serialize");
        let deserialized: AssetRecord = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.id, "minecraft:block/stone");
        assert_eq!(deserialized.labels.len(), 3);
        assert_eq!(deserialized.files.len(), 1);
    }

    #[test]
    fn test_override_selection_serialization() {
        let override_sel = OverrideSelection {
            pack_id: "custom_pack".to_string(),
            variant_path: Some("variant1".to_string()),
        };

        let json = serde_json::to_string(&override_sel).expect("should serialize");
        assert!(json.contains("\"packId\""));
        assert!(json.contains("\"variantPath\""));

        let deserialized: OverrideSelection = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized.pack_id, "custom_pack");
        assert_eq!(deserialized.variant_path, Some("variant1".to_string()));
    }

    #[test]
    fn test_override_selection_without_variant() {
        let override_sel = OverrideSelection {
            pack_id: "custom_pack".to_string(),
            variant_path: None,
        };

        let json = serde_json::to_string(&override_sel).expect("should serialize");
        let deserialized: OverrideSelection = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized.variant_path, None);
    }

    #[test]
    fn test_scan_result_default() {
        let scan_result = ScanResult::default();
        assert_eq!(scan_result.packs.len(), 0);
        assert_eq!(scan_result.assets.len(), 0);
        assert_eq!(scan_result.providers.len(), 0);
    }

    #[test]
    fn test_scan_result_serialization() {
        let scan_result = ScanResult {
            packs: vec![PackMeta {
                id: "pack1".to_string(),
                name: "Pack 1".to_string(),
                path: "/path/to/pack1".to_string(),
                size: 2048,
                is_zip: true,
                description: None,
                icon_data: None,
            }],
            assets: vec![AssetRecord {
                id: "minecraft:block/dirt".to_string(),
                labels: vec!["minecraft".to_string(), "block".to_string(), "dirt".to_string()],
                files: vec!["assets/minecraft/textures/block/dirt.png".to_string()],
            }],
            providers: {
                let mut map = HashMap::new();
                map.insert("minecraft:block/dirt".to_string(), vec!["pack1".to_string()]);
                map
            },
        };

        let json = serde_json::to_string(&scan_result).expect("should serialize");
        let deserialized: ScanResult = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.packs.len(), 1);
        assert_eq!(deserialized.assets.len(), 1);
        assert_eq!(deserialized.providers.len(), 1);
    }

    #[test]
    fn test_progress_serialization() {
        let progress = Progress {
            phase: "Indexing".to_string(),
            completed: 50,
            total: 100,
            bytes: Some(1024000),
        };

        let json = serde_json::to_string(&progress).expect("should serialize");
        let deserialized: Progress = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.phase, "Indexing");
        assert_eq!(deserialized.completed, 50);
        assert_eq!(deserialized.total, 100);
        assert_eq!(deserialized.bytes, Some(1024000));
    }

    #[test]
    fn test_pack_meta_clone() {
        let pack1 = PackMeta {
            id: "pack1".to_string(),
            name: "Pack 1".to_string(),
            path: "/path/to/pack1".to_string(),
            size: 512,
            is_zip: true,
            description: Some("Description".to_string()),
            icon_data: None,
        };

        let pack2 = pack1.clone();
        assert_eq!(pack1.id, pack2.id);
        assert_eq!(pack1.name, pack2.name);
        assert_eq!(pack1.size, pack2.size);
    }

    #[test]
    fn test_asset_record_clone() {
        let asset1 = AssetRecord {
            id: "test:asset".to_string(),
            labels: vec!["test".to_string()],
            files: vec!["file.png".to_string()],
        };

        let asset2 = asset1.clone();
        assert_eq!(asset1.id, asset2.id);
        assert_eq!(asset1.labels, asset2.labels);
        assert_eq!(asset1.files, asset2.files);
    }
}
