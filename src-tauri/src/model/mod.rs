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
