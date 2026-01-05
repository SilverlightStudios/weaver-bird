/// Extract particle texture mappings from Minecraft JAR
///
/// Reads particle definition JSONs from assets/minecraft/particles/*.json
/// and extracts the texture list for each particle type.

use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::PathBuf;

#[derive(serde::Serialize)]
struct ParticleTextureMapping {
    textures: Vec<String>,
}

#[derive(serde::Serialize)]
struct ParticleData {
    version: String,
    particles: HashMap<String, ParticleTextureMapping>,
}

use std::io::Read;
use zip::ZipArchive;

fn get_minecraft_jar_path(version: &str) -> io::Result<PathBuf> {
    // Use Weaverbird's vanilla_textures module to get the JAR path
    let versions = weaverbird_lib::util::vanilla_textures::list_all_available_versions()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    // Find the version we're looking for
    let version_info = versions.iter()
        .find(|v| v.version == version)
        .ok_or_else(|| io::Error::new(
            io::ErrorKind::NotFound,
            format!("Version {} not found in launcher directories", version)
        ))?;

    Ok(PathBuf::from(&version_info.jar_path))
}

fn extract_particle_textures(version: &str) -> io::Result<ParticleData> {
    let jar_path = get_minecraft_jar_path(version)?;
    println!("Reading particle definitions from JAR: {:?}", jar_path);

    let file = fs::File::open(&jar_path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;

    let mut particles = HashMap::new();

    // Iterate through all files in the JAR
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

        let name = file.name().to_string();

        // Look for particle definition JSONs
        if name.starts_with("assets/minecraft/particles/") && name.ends_with(".json") {
            // Extract particle type from filename
            let particle_type = name
                .strip_prefix("assets/minecraft/particles/")
                .and_then(|s| s.strip_suffix(".json"))
                .unwrap_or("");

            if particle_type.is_empty() {
                continue;
            }

            // Read and parse JSON
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;

            let json: Value = serde_json::from_str(&contents)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse {}: {}", name, e)))?;

            // Extract texture list from JSON
            // Minecraft particle JSONs have a "textures" array
            if let Some(textures_array) = json.get("textures").and_then(|t| t.as_array()) {
                let textures: Vec<String> = textures_array
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| {
                        // Remove "minecraft:" prefix if present
                        s.strip_prefix("minecraft:").unwrap_or(s).to_string()
                    })
                    .collect();

                if !textures.is_empty() {
                    particles.insert(
                        particle_type.to_string(),
                        ParticleTextureMapping { textures },
                    );
                }
            }
        }
    }

    Ok(ParticleData {
        version: version.to_string(),
        particles,
    })
}

fn save_particle_data(data: &ParticleData) -> io::Result<()> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "No cache directory"))?
        .join("weaverbird")
        .join("particle_data");

    fs::create_dir_all(&cache_dir)?;

    let cache_file = cache_dir.join(format!("{}.json", data.version));
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

    fs::write(&cache_file, json)?;

    println!("✓ Saved particle texture mappings to {:?}", cache_file);
    Ok(())
}

fn main() -> io::Result<()> {
    // Get the current cached Minecraft version
    let version = match weaverbird_lib::commands::get_cached_vanilla_version_impl() {
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

    println!("Extracting particle texture mappings for Minecraft {}", version);

    let data = extract_particle_textures(&version)?;

    println!("Found {} particle types:", data.particles.len());
    for (particle, mapping) in &data.particles {
        println!("  - {}: {} textures", particle, mapping.textures.len());
    }

    save_particle_data(&data)?;

    println!("\n✓ Successfully extracted particle texture mappings");
    Ok(())
}
