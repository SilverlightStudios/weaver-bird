//! Block Tester - Automated testing for all blocks in a resource pack
//!
//! This binary tests each block in the mock resource pack to verify
//! that blockstate resolution and model loading work correctly.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use weaverbird_lib::model::PackMeta;
use weaverbird_lib::util::{block_models, blockstates};

/// Test result for a single block
struct TestResult {
    block_id: String,
    success: bool,
    error: Option<String>,
    model_count: usize,
    duration_ms: u128,
}

fn main() {
    println!("=== Block Tester ===\n");

    // Get the path to the mock resource packs
    let project_root = std::env::current_dir()
        .expect("Failed to get current directory");

    // Check if we're in src-tauri directory
    let mock_packs_dir = if project_root.ends_with("src-tauri") {
        project_root.parent().unwrap().join("__mocks__/resourcepacks")
    } else {
        project_root.join("__mocks__/resourcepacks")
    };

    println!("Mock packs directory: {:?}", mock_packs_dir);

    if !mock_packs_dir.exists() {
        eprintln!("ERROR: Mock resource packs directory not found at {:?}", mock_packs_dir);
        std::process::exit(1);
    }

    // Find the Stay True pack (or any pack in the directory)
    let stay_true_dir = mock_packs_dir.join("Stay True");
    if !stay_true_dir.exists() {
        eprintln!("ERROR: Stay True pack not found at {:?}", stay_true_dir);
        std::process::exit(1);
    }

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

    // Create vanilla pack (we need this for fallbacks)
    let vanilla_cache_dir = weaverbird_lib::util::vanilla_textures::get_vanilla_cache_dir()
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
    let mut results: Vec<TestResult> = Vec::new();
    let mut success_count = 0;
    let mut error_count = 0;

    for block_id in &blocks {
        let start = Instant::now();

        // Try to resolve blockstate
        match test_block(&test_pack, &vanilla_pack, block_id) {
            Ok(model_count) => {
                let duration = start.elapsed().as_millis();
                println!("✓ {} ({} models, {}ms)", block_id, model_count, duration);
                results.push(TestResult {
                    block_id: block_id.clone(),
                    success: true,
                    error: None,
                    model_count,
                    duration_ms: duration,
                });
                success_count += 1;
            }
            Err(e) => {
                let duration = start.elapsed().as_millis();
                println!("✗ {}: {}", block_id, e);
                results.push(TestResult {
                    block_id: block_id.clone(),
                    success: false,
                    error: Some(e.to_string()),
                    model_count: 0,
                    duration_ms: duration,
                });
                error_count += 1;

                // Stop on first error to debug
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

    if error_count > 0 {
        println!("\nFirst error occurred at block: {}", results.last().unwrap().block_id);
        std::process::exit(1);
    }

    println!("\nAll blocks passed!");
}

/// Test a single block by resolving its blockstate and loading its models
fn test_block(pack: &PackMeta, vanilla_pack: &PackMeta, block_id: &str) -> Result<usize, String> {
    let pack_path = PathBuf::from(&pack.path);
    let vanilla_path = PathBuf::from(&vanilla_pack.path);

    // Try to find and read blockstate from pack first, then vanilla
    let blockstate = match blockstates::find_blockstate_file(&pack_path, block_id, pack.is_zip) {
        Some(actual_id) => {
            blockstates::read_blockstate(&pack_path, &actual_id, pack.is_zip)
                .map_err(|e| format!("Failed to read blockstate: {}", e))?
        }
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
    let resolution = blockstates::resolve_blockstate(
        &blockstate,
        block_id,
        Some(schema.default_state),
        None,
    ).map_err(|e| format!("Failed to resolve blockstate: {}", e))?;

    // Load each model
    for resolved_model in &resolution.models {
        block_models::resolve_block_model(pack, &resolved_model.modelId, vanilla_pack)
            .map_err(|e| format!("Failed to load model '{}': {}", resolved_model.modelId, e))?;
    }

    Ok(resolution.models.len())
}
