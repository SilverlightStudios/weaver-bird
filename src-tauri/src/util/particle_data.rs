/// Particle Data Module
///
/// Loads particle texture mappings from cached JSON files.
/// These mappings are extracted from Minecraft's particle definition JSONs.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::io::Read;
use zip::ZipArchive;

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

fn get_particle_data_cache_file(version: &str) -> io::Result<PathBuf> {
    Ok(get_particle_data_cache_dir()?.join(format!("{}.json", version)))
}

fn save_particle_data(data: &ParticleData) -> io::Result<()> {
    let cache_dir = get_particle_data_cache_dir()?;
    fs::create_dir_all(&cache_dir)?;

    let cache_file = cache_dir.join(format!("{}.json", data.version));
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

    fs::write(&cache_file, json)?;

    println!("✓ Saved particle texture mappings to {:?}", cache_file);
    Ok(())
}

fn parse_particle_textures(jar_path: &Path) -> io::Result<HashMap<String, ParticleTextureMapping>> {
    let file = fs::File::open(jar_path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    let mut particles = HashMap::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

        let name = file.name().to_string();
        if !name.starts_with("assets/minecraft/particles/") || !name.ends_with(".json") {
            continue;
        }

        let particle_type = name
            .strip_prefix("assets/minecraft/particles/")
            .and_then(|s| s.strip_suffix(".json"))
            .unwrap_or("");

        if particle_type.is_empty() {
            continue;
        }

        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        let json: serde_json::Value = serde_json::from_str(&contents)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse {}: {}", name, e)))?;

        if let Some(textures_array) = json.get("textures").and_then(|t| t.as_array()) {
            let textures: Vec<String> = textures_array
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.strip_prefix("minecraft:").unwrap_or(s).to_string())
                .collect();

            if !textures.is_empty() {
                particles.insert(
                    particle_type.to_string(),
                    ParticleTextureMapping { textures },
                );
            }
        }
    }

    Ok(particles)
}

pub fn extract_particle_textures(jar_path: &Path, version: &str) -> io::Result<ParticleData> {
    println!("Reading particle definitions from JAR: {:?}", jar_path);
    let particles = parse_particle_textures(jar_path)?;
    let data = ParticleData {
        version: version.to_string(),
        particles,
    };

    save_particle_data(&data)?;

    Ok(data)
}

pub fn is_particle_data_cached(version: &str) -> io::Result<bool> {
    Ok(get_particle_data_for_version(version)
        .map(|data| !data.particles.is_empty())
        .unwrap_or(false))
}

pub fn clear_particle_data_cache(version: &str) -> io::Result<()> {
    let cache_file = get_particle_data_cache_file(version)?;
    if cache_file.exists() {
        fs::remove_file(cache_file)?;
    }
    Ok(())
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
    let cache_file = get_particle_data_cache_file(version)?;

    if !cache_file.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("No cached particle data for version {}", version),
        ));
    }

    let json = fs::read_to_string(&cache_file)?;
    let data: ParticleData = serde_json::from_str(&json)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    if data.particles.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Cached particle data for {} is empty", version),
        ));
    }

    Ok(data)
}

pub fn get_or_extract_particle_data(
    jar_path: &Path,
    version: &str,
) -> io::Result<ParticleData> {
    match get_particle_data_for_version(version) {
        Ok(data) => Ok(data),
        Err(_) => extract_particle_textures(jar_path, version),
    }
}
