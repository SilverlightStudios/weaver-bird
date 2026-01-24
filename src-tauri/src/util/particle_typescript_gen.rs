/// Particle Data TypeScript Generator
///
/// Generates a comprehensive TypeScript file containing all particle data:
/// - Physics (from decompiled particle classes)
/// - Block emissions (from decompiled block classes)
/// - Entity emissions (from decompiled entity classes)
///
/// This eliminates the need for runtime Tauri calls.

use anyhow::{Context, Result};
use serde_json;
use std::fs;
use std::path::Path;
use super::block_particle_extractor::ExtractedBlockEmissions;
use super::particle_data::ParticleData as ParticleTextureData;
use super::particle_physics_extractor::ExtractedPhysicsData;

/// Generate comprehensive TypeScript particle data file
///
/// Combines physics and emissions into one file that the frontend can import.
pub fn generate_particle_data_typescript(
    physics: &ExtractedPhysicsData,
    block_emissions: &ExtractedBlockEmissions,
    particle_textures: &ParticleTextureData,
    output_path: &Path,
) -> Result<()> {
    // Serialize data to JSON
    let physics_json = serde_json::to_string_pretty(&physics.particles)
        .context("Failed to serialize physics data")?;
    let blocks_json = serde_json::to_string_pretty(&block_emissions.blocks)
        .context("Failed to serialize block emissions")?;
    let entities_json = serde_json::to_string_pretty(&block_emissions.entities)
        .context("Failed to serialize entity emissions")?;
    let textures_json = serde_json::to_string_pretty(&particle_textures.particles)
        .context("Failed to serialize particle textures")?;

    // Get timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let datetime = chrono::DateTime::from_timestamp(timestamp as i64, 0)
        .unwrap()
        .to_rfc3339();

    // Generate TypeScript content
    let ts_content = format!(
        r#"/**
 * Generated Particle Data
 *
 * Auto-generated from Minecraft {} by Rust extraction.
 * Do not edit manually - changes will be overwritten.
 *
 * Generated at: {}
 */
import type {{ ParticleData }} from "./types";

export const particleData: ParticleData = {{
  version: "{}",
  extractedAt: "{}",
  physics: {},
  blocks: {},
  entities: {},
  particles: {},
}};
"#,
        physics.version,
        datetime,
        physics.version,
        datetime,
        physics_json,
        blocks_json,
        entities_json,
        textures_json,
    );

    let tmp_path = output_path.with_extension("ts.tmp");
    fs::write(&tmp_path, ts_content)
        .context("Failed to write TypeScript particle data file")?;
    fs::rename(&tmp_path, output_path)
        .context("Failed to finalize TypeScript particle data file")?;

    println!("[particle_data] Generated TypeScript at {:?}", output_path);
    Ok(())
}
