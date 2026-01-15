/**
 * Standalone binary to extract block animations from Minecraft JAR
 *
 * Usage: cargo run --bin extract_block_animations
 *
 * This will:
 * 1. Load the cached vanilla version info
 * 2. Extract animations from block entities (bell, chest, shulker) and mobs
 * 3. Generate JPM-compatible keyframe data
 * 4. Cache the results for TypeScript generation
 */

use weaverbird_lib::commands::get_cached_vanilla_version_impl;
use weaverbird_lib::util::particle_cache;
use weaverbird_lib::util::block_animation_extractor::extract_block_animations;

fn main() {
    println!("[extract_block_animations] Starting extraction...");

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

    println!("[extract_block_animations] Extracting for Minecraft {}", version);

    let jar_path = match particle_cache::resolve_jar_path(&version) {
        Ok(path) => path,
        Err(e) => {
            eprintln!("Error resolving JAR path: {}", e);
            std::process::exit(1);
        }
    };

    // Create runtime for async extraction
    let runtime = tokio::runtime::Runtime::new().unwrap();

    // Extract animations
    match runtime.block_on(extract_block_animations(&jar_path, &version)) {
        Ok(animations) => {
            println!("\n[extract_block_animations] Successfully extracted {} entities", animations.entities.len());

            // Show examples
            if let Some(bell) = animations.entities.get("bell") {
                println!("\nExample - Bell:");
                for anim in &bell.animations {
                    println!("  Animation: {} (trigger: {:?}, duration: {} ticks, looping: {})",
                        anim.name, anim.trigger, anim.duration_ticks, anim.looping);
                    for (part_name, part_anim) in &anim.parts {
                        println!("    Part '{}': {} keyframes",
                            part_name,
                            part_anim.rotation_x.as_ref().map(|k| k.len()).unwrap_or(0)
                        );
                    }
                }
            }

            if let Some(chest) = animations.entities.get("chest") {
                println!("\nExample - Chest:");
                for anim in &chest.animations {
                    println!("  Animation: {} (trigger: {:?})", anim.name, anim.trigger);
                }
            }
        }
        Err(e) => {
            eprintln!("Error extracting animations: {}", e);
            std::process::exit(1);
        }
    }

    println!("\n[extract_block_animations] Done!");
    println!("Next step: Run 'npm run generate:animations' to create TypeScript files");
}
