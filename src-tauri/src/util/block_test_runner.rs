//! Block test runner - tests all blocks in a resource pack
//!
//! Run with: cargo test --lib test_all_blocks -- --nocapture

use crate::model::PackMeta;
use crate::util::{block_models, blockstates, vanilla_textures};
use std::fs;
use std::path::PathBuf;

/// Test a single block by resolving its blockstate and loading its models
pub fn test_block(
    pack: &PackMeta,
    vanilla_pack: &PackMeta,
    block_id: &str,
) -> Result<usize, String> {
    let pack_path = PathBuf::from(&pack.path);
    let vanilla_path = PathBuf::from(&vanilla_pack.path);

    // Try to find and read blockstate from pack first, then vanilla
    let blockstate = match blockstates::find_blockstate_file(&pack_path, block_id, pack.is_zip) {
        Some(actual_id) => blockstates::read_blockstate(&pack_path, &actual_id, pack.is_zip)
            .map_err(|e| format!("Failed to read blockstate: {}", e))?,
        None => {
            // Try vanilla
            match blockstates::find_blockstate_file(&vanilla_path, block_id, vanilla_pack.is_zip) {
                Some(actual_id) => {
                    blockstates::read_blockstate(&vanilla_path, &actual_id, vanilla_pack.is_zip)
                        .map_err(|e| format!("Failed to read vanilla blockstate: {}", e))?
                }
                None => {
                    return Err(format!("Blockstate not found: {}", block_id));
                }
            }
        }
    };

    // Build schema to get default state
    let schema = blockstates::build_block_state_schema(&blockstate, block_id);

    // Resolve blockstate with default properties
    let resolution = blockstates::resolve_blockstate(&blockstate, block_id, Some(schema.default_state), None)
        .map_err(|e| format!("Failed to resolve blockstate: {}", e))?;

    // Load each model
    for resolved_model in &resolution.models {
        block_models::resolve_block_model(pack, &resolved_model.modelId, vanilla_pack)
            .map_err(|e| format!("Failed to load model '{}': {}", resolved_model.modelId, e))?;
    }

    Ok(resolution.models.len())
}

/// Get the mock resource packs directory
pub fn get_mock_packs_dir() -> PathBuf {
    // Find the project root by looking for Cargo.toml
    let mut current = std::env::current_dir().expect("Failed to get current directory");

    // Navigate up until we find the __mocks__ directory
    loop {
        let mock_dir = current.join("__mocks__/resourcepacks");
        if mock_dir.exists() {
            return mock_dir;
        }

        // Check if parent has it (we might be in src-tauri)
        if let Some(parent) = current.parent() {
            let parent_mock = parent.join("__mocks__/resourcepacks");
            if parent_mock.exists() {
                return parent_mock;
            }
            current = parent.to_path_buf();
        } else {
            panic!("Could not find __mocks__/resourcepacks directory");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_blocks() {
        println!("\n=== Block Tester ===\n");

        // Get the path to the mock resource packs
        let mock_packs_dir = get_mock_packs_dir();
        println!("Mock packs directory: {:?}", mock_packs_dir);

        // Find the Stay True pack
        let stay_true_dir = mock_packs_dir.join("Stay True");
        assert!(
            stay_true_dir.exists(),
            "Stay True pack not found at {:?}",
            stay_true_dir
        );

        // Create pack metadata
        let test_pack = PackMeta {
            id: "stay-true".to_string(),
            name: "Stay True".to_string(),
            path: stay_true_dir.to_string_lossy().to_string(),
            size: 0,
            is_zip: false,
            description: Some("Test pack".to_string()),
            icon_data: None,
        };

        // Create vanilla pack
        let vanilla_cache_dir = vanilla_textures::get_vanilla_cache_dir()
            .expect("Failed to get vanilla cache dir");

        let vanilla_pack = PackMeta {
            id: "minecraft:vanilla".to_string(),
            name: "Minecraft (Vanilla)".to_string(),
            path: vanilla_cache_dir.to_string_lossy().to_string(),
            size: 0,
            is_zip: false,
            description: Some("Default Minecraft textures".to_string()),
            icon_data: None,
        };

        println!("Test pack: {} at {}", test_pack.name, test_pack.path);
        println!("Vanilla pack: {}", vanilla_pack.path);
        println!();

        // Get all blockstate files
        let blockstates_dir = stay_true_dir.join("assets/minecraft/blockstates");
        let mut blocks: Vec<String> = Vec::new();

        if let Ok(entries) = fs::read_dir(&blockstates_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "json") {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        blocks.push(stem.to_string());
                    }
                }
            }
        }

        blocks.sort();
        println!("Found {} blocks to test\n", blocks.len());

        // Run tests
        let mut success_count = 0;
        let mut error_count = 0;
        let mut first_error: Option<(String, String)> = None;

        for block_id in &blocks {
            match test_block(&test_pack, &vanilla_pack, block_id) {
                Ok(model_count) => {
                    println!("✓ {} ({} models)", block_id, model_count);
                    success_count += 1;
                }
                Err(e) => {
                    println!("✗ {}: {}", block_id, e);
                    error_count += 1;

                    if first_error.is_none() {
                        first_error = Some((block_id.clone(), e.clone()));
                    }

                    // Stop on first error to allow fixing
                    println!("\n=== STOPPED ON FIRST ERROR ===");
                    println!("Block: {}", block_id);
                    println!("Error: {}", e);
                    break;
                }
            }
        }

        // Print summary
        println!("\n=== Summary ===");
        println!("Total: {}", blocks.len());
        println!("Success: {}", success_count);
        println!("Error: {}", error_count);
        println!("Remaining: {}", blocks.len() - success_count - error_count);

        if let Some((block, err)) = first_error {
            panic!("Test failed at block '{}': {}", block, err);
        }

        println!("\nAll blocks passed!");
    }
}
