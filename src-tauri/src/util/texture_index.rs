/// Texture Index Builder
///
/// Builds a reverse mapping from texture paths to block IDs by analyzing
/// all blockstates and models in a resource pack.
///
/// This is the "correct" way to determine which block a texture belongs to,
/// rather than guessing from the filename.
use crate::model::PackMeta;
use crate::util::{block_models, blockstates};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

/// Maps texture paths to the blocks that use them
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextureIndex {
    /// texture_path (e.g., "block/acacia_log") -> list of block IDs that use it
    pub texture_to_blocks: HashMap<String, Vec<String>>,
}

impl TextureIndex {
    /// Build a texture index by scanning all blockstates and models in a pack
    pub fn build(pack: &PackMeta, vanilla_pack: &PackMeta) -> Result<Self> {
        let mut texture_to_blocks: HashMap<String, HashSet<String>> = HashMap::new();

        let blockstates_dir = if pack.is_zip {
            // For ZIP packs, we'd need to enumerate ZIP entries
            // For now, we'll return empty index and rely on fallback
            return Ok(Self {
                texture_to_blocks: HashMap::new(),
            });
        } else {
            Path::new(&pack.path).join("assets/minecraft/blockstates")
        };

        // If blockstates directory doesn't exist, try vanilla
        let blockstates_to_scan = if blockstates_dir.exists() {
            vec![blockstates_dir.clone()]
        } else {
            vec![Path::new(&vanilla_pack.path).join("assets/minecraft/blockstates")]
        };

        for blockstates_path in blockstates_to_scan {
            if !blockstates_path.exists() {
                continue;
            }

            // Scan all blockstate files
            let entries = match fs::read_dir(&blockstates_path) {
                Ok(entries) => entries,
                Err(_) => continue,
            };

            for entry in entries.flatten() {
                let path = entry.path();

                if path.extension().and_then(|s| s.to_str()) != Some("json") {
                    continue;
                }

                if let Some(block_id) = path.file_stem().and_then(|s| s.to_str()) {
                    // Parse blockstate and extract textures
                    if let Ok(textures) = extract_textures_from_block(block_id, pack, vanilla_pack)
                    {
                        // Add mappings
                        for texture in textures {
                            texture_to_blocks
                                .entry(texture)
                                .or_insert_with(HashSet::new)
                                .insert(block_id.to_string());
                        }
                    }
                }
            }
        }

        // Convert HashSet to Vec for serialization
        let texture_to_blocks: HashMap<String, Vec<String>> = texture_to_blocks
            .into_iter()
            .map(|(k, v)| (k, v.into_iter().collect()))
            .collect();

        Ok(Self { texture_to_blocks })
    }

    /// Get the block IDs that use a given texture
    pub fn get_blocks_for_texture(&self, texture_path: &str) -> Option<&Vec<String>> {
        self.texture_to_blocks.get(texture_path)
    }

    /// Get the primary block for a texture (first in the list)
    pub fn get_primary_block(&self, texture_path: &str) -> Option<&str> {
        self.texture_to_blocks
            .get(texture_path)
            .and_then(|blocks| blocks.first())
            .map(|s| s.as_str())
    }
}

/// Extract all texture paths used by a block
fn extract_textures_from_block(
    block_id: &str,
    pack: &PackMeta,
    vanilla_pack: &PackMeta,
) -> Result<HashSet<String>> {
    let mut textures = HashSet::new();

    // Read the blockstate
    let blockstate =
        match blockstates::read_blockstate(&PathBuf::from(&pack.path), block_id, pack.is_zip) {
            Ok(bs) => bs,
            Err(_) => {
                // Try vanilla
                blockstates::read_blockstate(
                    &PathBuf::from(&vanilla_pack.path),
                    block_id,
                    vanilla_pack.is_zip,
                )
                .map_err(|e| anyhow::anyhow!("Failed to read blockstate: {}", e))?
            }
        };

    // Get the default model from blockstate
    let model_id =
        blockstates::get_default_model(&blockstate).context("No default model in blockstate")?;

    // Load and resolve the model
    let model = block_models::resolve_block_model(pack, &model_id, vanilla_pack)
        .map_err(|e| anyhow::anyhow!("Failed to resolve block model: {}", e))?;

    // Extract texture references
    if let Some(model_textures) = model.textures {
        for (_key, texture_path) in model_textures {
            // Remove "minecraft:" prefix if present
            let clean_path = texture_path
                .strip_prefix("minecraft:")
                .unwrap_or(&texture_path)
                .to_string();

            // Skip texture variables (start with #)
            if !clean_path.starts_with('#') {
                textures.insert(clean_path);
            }
        }
    }

    Ok(textures)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_texture_index_creation() {
        // Test that we can create an empty index
        let index = TextureIndex {
            texture_to_blocks: HashMap::new(),
        };

        assert_eq!(index.get_blocks_for_texture("block/dirt"), None);
    }
}
