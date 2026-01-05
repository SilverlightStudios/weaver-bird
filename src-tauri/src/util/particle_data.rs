/// Particle Data Module
///
/// Loads particle texture mappings from cached JSON files.
/// These mappings are extracted from Minecraft's particle definition JSONs.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::PathBuf;

/// Particle texture mapping from Minecraft
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticleTextureMapping {
    pub textures: Vec<String>,
}

/// Complete particle data for a Minecraft version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticleData {
    pub version: String,
    pub particles: HashMap<String, ParticleTextureMapping>,
}

/// Get the cache directory for particle data
fn get_particle_data_cache_dir() -> io::Result<PathBuf> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "No cache directory found"))?;

    let weaverbird_cache = cache_dir.join("weaverbird").join("particle_data");
    Ok(weaverbird_cache)
}

/// Get particle texture mappings for the currently cached Minecraft version
///
/// Returns particle data if cached, otherwise returns error.
pub fn get_particle_data() -> io::Result<ParticleData> {
    // Get the currently cached vanilla version
    let version = crate::util::vanilla_textures::get_cached_version()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "No cached vanilla version"))?;

    get_particle_data_for_version(&version)
}

/// Get particle texture mappings for a specific Minecraft version
///
/// # Arguments
/// * `version` - Minecraft version string (e.g., "1.21.4")
///
/// # Returns
/// Particle data with particle type -> texture mappings
pub fn get_particle_data_for_version(version: &str) -> io::Result<ParticleData> {
    let cache_dir = get_particle_data_cache_dir()?;
    let cache_file = cache_dir.join(format!("{}.json", version));

    if !cache_file.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("No cached particle data for version {}", version),
        ));
    }

    let json = fs::read_to_string(&cache_file)?;
    let data: ParticleData = serde_json::from_str(&json)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    Ok(data)
}
