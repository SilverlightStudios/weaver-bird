/// Build Weaver Nest - the optimized output resource pack
use crate::model::{AssetRecord, OverrideSelection, PackMeta};
use crate::util::zip;
use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Entry representing a winning asset to be copied
#[allow(dead_code)]
struct WinnerEntry {
    /// Asset ID for debugging/logging purposes
    asset_id: String,
    source_pack_id: String,
    source_path: String,
    source_is_zip: bool,
}

/// Build Weaver Nest output pack
///
/// pack_order: List of pack IDs in priority order (top = highest priority)
/// overrides: Map of asset_id -> override payload (pack + optional variant path)
/// output_dir: Where to write the Weaver Nest pack
pub fn build_weaver_nest(
    packs: &[PackMeta],
    assets: &[AssetRecord],
    providers: &HashMap<String, Vec<String>>, // asset_id -> [pack_ids]
    pack_order: &[String],
    overrides: &HashMap<String, OverrideSelection>, // asset_id -> override payload
    output_dir: &str,
) -> Result<()> {
    let output_path = Path::new(output_dir);

    // Create output directory
    fs::create_dir_all(output_path)?;

    // Create pack.mcmeta
    create_pack_mcmeta(output_path)?;

    // Determine winners for each asset
    let mut winners = Vec::new();

    for asset in assets {
        let mut override_source_path: Option<String> = None;
        let winner_pack_id = if let Some(override_entry) = overrides.get(&asset.id) {
            if let Some(path) = &override_entry.variant_path {
                override_source_path = Some(path.clone());
            }
            override_entry.pack_id.clone()
        } else {
            // Use first pack in order that provides this asset
            let providing_packs = providers.get(&asset.id).cloned().unwrap_or_default();
            if providing_packs.is_empty() {
                continue;
            }

            let winner = providing_packs
                .iter()
                .min_by_key(|pack_id| {
                    pack_order
                        .iter()
                        .position(|id| id == *pack_id)
                        .unwrap_or(usize::MAX)
                })
                .cloned();

            match winner {
                Some(pack_id) => pack_id,
                None => continue,
            }
        };

        // Find the pack metadata
        let winner_pack = packs
            .iter()
            .find(|p| p.id == winner_pack_id)
            .ok_or_else(|| anyhow!("Pack not found: {}", winner_pack_id))?;

        // Find the file to copy (first one in the asset's file list or overridden variant)
        // In a real implementation, you might want to merge multiple files
        if let Some(source_file) = override_source_path.or_else(|| asset.files.first().cloned()) {
            winners.push(WinnerEntry {
                asset_id: asset.id.clone(),
                source_pack_id: winner_pack.id.clone(),
                source_path: source_file,
                source_is_zip: winner_pack.is_zip,
            });
        }
    }

    // Copy winner files to output
    let pack_map: HashMap<String, &PackMeta> = packs.iter().map(|p| (p.id.clone(), p)).collect();

    for winner in winners {
        let source_pack = pack_map
            .get(&winner.source_pack_id)
            .ok_or_else(|| anyhow!("Pack not found: {}", winner.source_pack_id))?;

        let content = if winner.source_is_zip {
            zip::extract_zip_entry(&source_pack.path, &winner.source_path)?
        } else {
            let full_path = Path::new(&source_pack.path).join(&winner.source_path);
            fs::read(&full_path)?
        };

        // Write to output
        let output_file_path = output_path.join(&winner.source_path);
        fs::create_dir_all(output_file_path.parent().unwrap())?;
        fs::write(&output_file_path, content)?;
    }

    Ok(())
}

/// Create pack.mcmeta file
fn create_pack_mcmeta(output_path: &Path) -> Result<()> {
    let pack_mcmeta = r#"{
  "pack": {
    "pack_format": 48,
    "description": "Weaverbird - Optimized Resource Pack"
  }
}
"#;

    let mcmeta_path = output_path.join("pack.mcmeta");
    fs::write(mcmeta_path, pack_mcmeta)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pack_mcmeta() {
        // Placeholder test
    }
}
