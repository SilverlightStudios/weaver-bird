/// Standalone binary to generate TypeScript particle data from cached extractions
///
/// Usage: cargo run --bin generate_particles
use std::fs;

fn main() {
    println!("Generating TypeScript particle data from cached extractions...");
    println!();

    // Get cache directory
    let cache_dir = match dirs::cache_dir() {
        Some(dir) => dir.join("weaverbird"),
        None => {
            eprintln!("✗ Could not determine cache directory");
            std::process::exit(1);
        }
    };

    // Find the latest cached version
    let physics_dir = cache_dir.join("particle_physics");
    let emissions_dir = cache_dir.join("block_emissions");

    println!("Looking for cached data in:");
    println!("  Physics: {:?}", physics_dir);
    println!("  Emissions: {:?}", emissions_dir);
    println!();

    // Find JSON files
    let physics_files: Vec<_> = match fs::read_dir(&physics_dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("json"))
            .collect(),
        Err(_) => {
            eprintln!("✗ Could not read physics cache directory");
            std::process::exit(1);
        }
    };

    let emissions_files: Vec<_> = match fs::read_dir(&emissions_dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("json"))
            .collect(),
        Err(_) => {
            eprintln!("✗ Could not read emissions cache directory");
            std::process::exit(1);
        }
    };

    if physics_files.is_empty() {
        eprintln!("✗ No cached physics data found");
        eprintln!("  Run vanilla texture initialization in the app first");
        std::process::exit(1);
    }

    if emissions_files.is_empty() {
        eprintln!("✗ No cached emissions data found");
        eprintln!("  Run vanilla texture initialization in the app first");
        std::process::exit(1);
    }

    // Use the first JSON file found (most recent)
    let physics_path = physics_files[0].path();
    let emissions_path = emissions_files[0].path();

    println!("✓ Found physics data: {}", physics_path.file_name().unwrap().to_str().unwrap());
    println!("✓ Found emissions data: {}", emissions_path.file_name().unwrap().to_str().unwrap());
    println!();

    // Read the JSON files
    let physics_json = match fs::read_to_string(&physics_path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("✗ Failed to read physics file: {}", e);
            std::process::exit(1);
        }
    };

    let emissions_json = match fs::read_to_string(&emissions_path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("✗ Failed to read emissions file: {}", e);
            std::process::exit(1);
        }
    };

    // Parse JSON to extract version and data
    let physics_value: serde_json::Value = match serde_json::from_str(&physics_json) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("✗ Failed to parse physics JSON: {}", e);
            std::process::exit(1);
        }
    };

    let emissions_value: serde_json::Value = match serde_json::from_str(&emissions_json) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("✗ Failed to parse emissions JSON: {}", e);
            std::process::exit(1);
        }
    };

    let version = physics_value["version"].as_str().unwrap_or("unknown");
    let physics_data = &physics_value["particles"];
    let blocks_data = &emissions_value["blocks"];
    let entities_data = &emissions_value["entities"];

    println!("Generating TypeScript for version: {}", version);

    // Generate TypeScript content
    let timestamp = chrono::Utc::now().to_rfc3339();

    // Convert null to undefined and snake_case to camelCase for TypeScript compatibility
    let physics_json_str = serde_json::to_string_pretty(physics_data)
        .unwrap()
        .replace(": null", ": undefined")
        .replace("\"has_physics\"", "\"hasPhysics\"")
        .replace("\"velocity_multiplier\"", "\"velocityMultiplier\"")
        .replace("\"velocity_add\"", "\"velocityAdd\"")
        .replace("\"velocity_jitter\"", "\"velocityJitter\"")
        .replace("\"color_scale\"", "\"colorScale\"")
        .replace("\"lifetime_base\"", "\"lifetimeBase\"")
        .replace("\"lifetime_animation\"", "\"lifetimeAnimation\"");

    let blocks_json_str = serde_json::to_string_pretty(blocks_data)
        .unwrap()
        .replace(": null", ": undefined")
        .replace("\"particle_id\"", "\"particleId\"")
        .replace("\"position_offset\"", "\"positionExpr\"")
        .replace("\"velocity\"", "\"velocityExpr\"")
        .replace("\"class_name\"", "\"className\"")
        // Add rate field: animateTick runs once per client tick (20Hz), so each emission is 20/sec
        .replace("\"condition\":", "\"rate\": 20,\n        \"condition\":");

    let entities_json_str = serde_json::to_string_pretty(entities_data)
        .unwrap()
        .replace(": null", ": undefined")
        .replace("\"particle_id\"", "\"particleId\"")
        .replace("\"position_offset\"", "\"positionExpr\"")
        .replace("\"velocity\"", "\"velocityExpr\"")
        .replace("\"class_name\"", "\"className\"")
        // Add rate field for entities as well
        .replace("\"condition\":", "\"rate\": 20,\n        \"condition\":");

    let ts_content = format!(
        r#"/**
 * Generated Particle Data
 * Auto-generated from Minecraft {} by Rust extraction.
 * Generated at: {}
 */
import type {{ ParticleData }} from "./types";

export const particleData: ParticleData = {{
  version: "{}",
  extractedAt: "{}",
  physics: {},
  blocks: {},
  entities: {},
}};
"#,
        version,
        timestamp,
        version,
        timestamp,
        physics_json_str,
        blocks_json_str,
        entities_json_str
    );

    // Determine output path - use current working directory to find project root
    // When run via npm script, cwd is src-tauri, so go up one level
    let cwd = std::env::current_dir().unwrap();
    let project_root = if cwd.ends_with("src-tauri") {
        cwd.parent().unwrap()
    } else {
        &cwd
    };

    let output_path = project_root.join("src/constants/particles/generated.ts");

    println!("Writing to: {:?}", output_path);

    // Write the file
    match fs::write(&output_path, ts_content) {
        Ok(_) => {
            println!();
            println!("✓ Success! Generated TypeScript particle data");
            println!("  Version: {}", version);
            println!("  File: {:?}", output_path);
            std::process::exit(0);
        }
        Err(e) => {
            eprintln!("✗ Failed to write TypeScript file: {}", e);
            std::process::exit(1);
        }
    }
}
