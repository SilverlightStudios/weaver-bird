/**
 * Standalone binary to extract particle physics from Minecraft JAR
 *
 * Usage: cargo run --bin extract_particle_physics
 *
 * This will:
 * 1. Load the cached vanilla version info
 * 2. Extract particle physics from the JAR file (color_scale, gravity, etc.)
 * 3. Cache the results for use by the app and TypeScript generation
 */

use weaverbird_lib::commands::get_cached_vanilla_version_impl;
use weaverbird_lib::util::particle_physics_extractor::extract_particle_physics;
use weaverbird_lib::util::vanilla_textures;

fn main() {
    println!("[extract_particle_physics] Starting extraction...");

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

    println!("[extract_particle_physics] Extracting for Minecraft {}", version);

    // Get the JAR path for this version
    let versions = match vanilla_textures::list_all_available_versions() {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Error listing versions: {}", e);
            std::process::exit(1);
        }
    };

    let version_info = versions
        .iter()
        .find(|v| v.version == version)
        .expect("Version not found");

    let jar_path = std::path::PathBuf::from(&version_info.jar_path);

    // Create runtime for async extraction
    let runtime = tokio::runtime::Runtime::new().unwrap();

    // Extract physics
    match runtime.block_on(extract_particle_physics(&jar_path, &version)) {
        Ok(physics) => {
            println!("\n[extract_particle_physics] Successfully extracted {} particle types", physics.particles.len());

            // Show a few examples
            if let Some((name, data)) = physics.particles.get_key_value("smoke") {
                println!("\nExample - {}:", name);
                println!("  behavior: {:?}", data.behavior);
                println!("  color_scale: {:?}", data.color_scale);
                println!("  gravity: {:?}", data.gravity);
                println!("  friction: {:?}", data.friction);
            }

            if let Some((name, data)) = physics.particles.get_key_value("flame") {
                println!("\nExample - {}:", name);
                println!("  behavior: {:?}", data.behavior);
                println!("  lifetime: {:?}", data.lifetime);
                println!("  gravity: {:?}", data.gravity);
            }
        }
        Err(e) => {
            eprintln!("Error extracting particle physics: {}", e);
            std::process::exit(1);
        }
    }

    println!("\n[extract_particle_physics] Done!");
}
