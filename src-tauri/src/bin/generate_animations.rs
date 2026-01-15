/**
 * Standalone binary to generate TypeScript animation files from cached extractions
 *
 * Usage: cargo run --bin generate_animations
 *
 * This will:
 * 1. Load cached animation data from ~/Library/Caches/weaverbird/block_animations/
 * 2. Generate TypeScript files in src/constants/animations/generated/
 * 3. Create individual files per entity (bell.ts, chest.ts, etc.)
 * 4. Create index.ts with VANILLA_ANIMATIONS export
 */

use weaverbird_lib::commands::get_cached_vanilla_version_impl;
use weaverbird_lib::util::block_animation_extractor::load_cached_animation_data;
use weaverbird_lib::util::animation_typescript_gen::generate_animation_typescript;
use std::path::PathBuf;

fn main() {
    println!("[generate_animations] Generating TypeScript animation files...\n");

    // Get cached vanilla version
    let version = match get_cached_vanilla_version_impl() {
        Ok(Some(v)) => v,
        Ok(None) => {
            eprintln!("Error: No cached vanilla version found. Run the app first to initialize.");
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("Error getting cached vanilla version: {}", e);
            std::process::exit(1);
        }
    };

    println!("[generate_animations] Using Minecraft version: {}", version);

    // Load cached animation data
    let animations = match load_cached_animation_data(&version) {
        Ok(Some(data)) => data,
        Ok(None) => {
            eprintln!("Error: No cached animation data found for version {}", version);
            eprintln!("Run 'cargo run --bin extract_block_animations' first to extract animations");
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("Error loading cached animation data: {}", e);
            std::process::exit(1);
        }
    };

    println!("[generate_animations] Loaded {} entities from cache", animations.entities.len());

    // Determine output directory (src/constants/animations/generated)
    let output_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("src/constants/animations/generated");

    println!("[generate_animations] Output directory: {:?}\n", output_dir);

    // Generate TypeScript files
    match generate_animation_typescript(&animations, &output_dir) {
        Ok(_) => {
            println!("\n[generate_animations] ✓ Successfully generated TypeScript files");
            println!("\nGenerated files:");
            for entity_id in animations.entities.keys() {
                println!("  - {}.ts", entity_id);
            }
            println!("  - index.ts");
            println!("\nYou can now import animations:");
            println!("  import {{ VANILLA_ANIMATIONS }} from '@constants/animations/generated';");
        }
        Err(e) => {
            eprintln!("Error generating TypeScript files: {}", e);
            std::process::exit(1);
        }
    }
}
