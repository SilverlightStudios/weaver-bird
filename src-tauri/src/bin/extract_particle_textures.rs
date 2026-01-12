/**
 * Standalone binary to extract particle texture mappings from Minecraft JAR
 *
 * Usage: cargo run --bin extract_particle_textures
 *
 * This will:
 * 1. Load the cached vanilla version info
 * 2. Extract particle texture mappings from the JAR file
 * 3. Cache the results for use by the app and TypeScript generation
 */

use weaverbird_lib::commands::get_cached_vanilla_version_impl;
use weaverbird_lib::util::{particle_cache, particle_data};

fn main() {
    println!("[extract_particle_textures] Starting extraction...");

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

    println!("[extract_particle_textures] Extracting for Minecraft {}", version);

    let jar_path = match particle_cache::resolve_jar_path(&version) {
        Ok(path) => path,
        Err(e) => {
            eprintln!("Error resolving JAR path: {}", e);
            std::process::exit(1);
        }
    };

    match particle_data::extract_particle_textures(&jar_path, &version) {
        Ok(data) => {
            println!(
                "[extract_particle_textures] Successfully extracted {} particle textures",
                data.particles.len()
            );
        }
        Err(e) => {
            eprintln!("Error extracting particle textures: {}", e);
            std::process::exit(1);
        }
    }

    println!("[extract_particle_textures] Done!");
}
