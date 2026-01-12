/// Utilities for extracting and caching vanilla Minecraft textures
use anyhow::{anyhow, Context, Result};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use walkdir::WalkDir;
use zip::ZipArchive;

use crate::util::mc_paths;

/// Progress callback type for extraction
pub type ProgressCallback = Arc<dyn Fn(usize, usize) + Send + Sync>;

/// Information about a Minecraft version
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MinecraftVersion {
    /// Version identifier (e.g., "1.21.4", "24w45a")
    pub version: String,
    /// Full path to the version JAR file
    pub jar_path: String,
    /// Last modification time (for sorting)
    pub modified_time: u64,
}

impl MinecraftVersion {
    /// Compare versions for sorting (newest first)
    /// Handles both release versions (1.20.1) and snapshots (24w45a)
    fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
        // Parse release versions (e.g., "1.20.1")
        fn parse_release(v: &str) -> Option<Vec<u32>> {
            v.split('.')
                .map(|part| part.parse::<u32>().ok())
                .collect::<Option<Vec<_>>>()
        }

        // Parse snapshot versions (e.g., "24w45a" = year 2024, week 45, iteration a)
        fn parse_snapshot(v: &str) -> Option<(u32, u32, char)> {
            if v.len() < 5 {
                return None;
            }
            let year = v[..2].parse::<u32>().ok()?;
            if v.chars().nth(2)? != 'w' {
                return None;
            }
            let week_end = v[3..]
                .find(|c: char| c.is_alphabetic())
                .unwrap_or(v.len() - 3);
            let week = v[3..3 + week_end].parse::<u32>().ok()?;
            let iter = v.chars().last()?;
            Some((year, week, iter))
        }

        // Try parsing as release versions
        if let (Some(a_parts), Some(b_parts)) = (parse_release(a), parse_release(b)) {
            return b_parts.cmp(&a_parts); // Reversed for descending order
        }

        // Try parsing as snapshots
        if let (Some(a_snap), Some(b_snap)) = (parse_snapshot(a), parse_snapshot(b)) {
            return b_snap.cmp(&a_snap); // Reversed for descending order
        }

        // If one is release and one is snapshot, prefer release
        if parse_release(a).is_some() && parse_snapshot(b).is_some() {
            return std::cmp::Ordering::Less; // a (release) > b (snapshot)
        }
        if parse_snapshot(a).is_some() && parse_release(b).is_some() {
            return std::cmp::Ordering::Greater; // b (release) > a (snapshot)
        }

        // Fallback to string comparison
        b.cmp(a) // Reversed for descending order
    }
}

/// Get the directory where vanilla textures are cached
pub fn get_vanilla_cache_dir() -> Result<PathBuf> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Could not find cache directory"))?
        .join("weaverbird")
        .join("vanilla_textures");

    fs::create_dir_all(&cache_dir).context("Failed to create vanilla textures cache directory")?;

    Ok(cache_dir)
}

/// Check if Minecraft is installed at the given directory
/// Works with both official launcher (.minecraft/versions) and Modrinth (meta/versions)
pub fn check_minecraft_installation(mc_dir: &Path) -> Result<bool> {
    if !mc_dir.exists() {
        return Ok(false);
    }

    // Check for official launcher structure
    if mc_dir.join("versions").exists() {
        return Ok(true);
    }

    // Check for Modrinth launcher structure (if path ends with "meta", versions is directly inside)
    // Otherwise check for meta/versions
    if mc_dir.file_name().and_then(|n| n.to_str()) == Some("meta") {
        if mc_dir.join("versions").exists() {
            return Ok(true);
        }
    } else if mc_dir.join("meta/versions").exists() {
        return Ok(true);
    }

    Ok(false)
}

/// Get suggested Minecraft directory paths for the current platform
pub fn get_suggested_minecraft_paths() -> Vec<String> {
    let mut paths = Vec::new();

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(format!("{}/Library/Application Support/minecraft", home));
            paths.push(format!(
                "{}/Library/Application Support/ModrinthApp/meta",
                home
            ));
            paths.push(format!(
                "{}/Library/Application Support/com.modrinth.theseus/meta",
                home
            ));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            paths.push(format!("{}/.minecraft", appdata));
            paths.push(format!("{}\\.minecraft", appdata));
            paths.push(format!("{}\\ModrinthApp\\meta", appdata));
            paths.push(format!("{}\\com.modrinth.theseus\\meta", appdata));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            paths.push(format!("{}/.minecraft", home));
            paths.push(format!("{}/.local/share/ModrinthApp/meta", home));
            paths.push(format!("{}/.local/share/com.modrinth.theseus/meta", home));
        }
    }

    paths
}

/// List all available Minecraft versions from a specific directory
pub fn list_available_versions_from_dir(mc_dir: &Path) -> Result<Vec<MinecraftVersion>> {
    let versions_dir = mc_dir.join("versions");

    if !versions_dir.exists() {
        return Err(anyhow!(
            "Minecraft versions directory not found at {}",
            versions_dir.display()
        ));
    }

    let mut versions: Vec<MinecraftVersion> = Vec::new();

    // Scan all version directories
    for entry in fs::read_dir(&versions_dir)
        .context("Failed to read versions directory")?
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if let Some(version_name) = path.file_name().and_then(|n| n.to_str()) {
            let jar_path = path.join(format!("{}.jar", version_name));
            if jar_path.exists() {
                // Get modification time
                let modified_time = fs::metadata(&jar_path)
                    .and_then(|m| m.modified())
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                versions.push(MinecraftVersion {
                    version: version_name.to_string(),
                    jar_path: jar_path.to_string_lossy().to_string(),
                    modified_time,
                });
            }
        }
    }

    if versions.is_empty() {
        return Err(anyhow!(
            "No Minecraft version JAR files found in {}",
            versions_dir.display()
        ));
    }

    // Sort by semantic version (highest version first)
    versions.sort_by(|a, b| MinecraftVersion::compare_versions(&a.version, &b.version));

    Ok(versions)
}

/// Find the latest Minecraft version JAR file from a specific Minecraft directory
pub fn find_latest_version_jar_from_dir(mc_dir: &Path) -> Result<PathBuf> {
    let versions = list_available_versions_from_dir(mc_dir)?;
    let latest = versions
        .first()
        .ok_or_else(|| anyhow!("No versions found"))?;
    Ok(PathBuf::from(&latest.jar_path))
}

/// List all available Minecraft versions from all detected launcher locations
pub fn list_all_available_versions() -> Result<Vec<MinecraftVersion>> {
    let mut all_versions = Vec::new();
    let mut search_paths = Vec::new();

    // Try official Minecraft launcher first
    if let Ok(mc_dir) = mc_paths::get_default_minecraft_dir() {
        search_paths.push(mc_dir);
    }

    // Try Modrinth launcher
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            search_paths
                .push(PathBuf::from(&home).join("Library/Application Support/ModrinthApp/meta"));
            search_paths.push(
                PathBuf::from(&home).join("Library/Application Support/com.modrinth.theseus/meta"),
            );
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            search_paths.push(PathBuf::from(&appdata).join("ModrinthApp/meta"));
            search_paths.push(PathBuf::from(&appdata).join("com.modrinth.theseus/meta"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            search_paths.push(PathBuf::from(&home).join(".local/share/ModrinthApp/meta"));
            search_paths.push(PathBuf::from(&home).join(".local/share/com.modrinth.theseus/meta"));
        }
    }

    // Collect versions from all paths
    for path in search_paths {
        if let Ok(versions) = list_available_versions_from_dir(&path) {
            all_versions.extend(versions);
        }
    }

    if all_versions.is_empty() {
        return Err(anyhow!(
            "Could not find any Minecraft versions. Tried official launcher and Modrinth App."
        ));
    }

    // Sort by semantic version and remove duplicates (same version from different launchers)
    all_versions.sort_by(|a, b| MinecraftVersion::compare_versions(&a.version, &b.version));
    all_versions.dedup_by(|a, b| a.version == b.version);

    Ok(all_versions)
}

/// Find the latest Minecraft version JAR file
/// Checks multiple launcher locations in order of preference
pub fn find_latest_version_jar() -> Result<PathBuf> {
    let versions = list_all_available_versions()?;
    let latest = versions
        .first()
        .ok_or_else(|| anyhow!("No versions found"))?;
    Ok(PathBuf::from(&latest.jar_path))
}

/// Get the currently cached version info (if any)
pub fn get_cached_version() -> Result<Option<String>> {
  let cache_dir = get_vanilla_cache_dir()?;
  let marker_file = cache_dir.join(".extracted_version");

    if marker_file.exists() {
        let version = fs::read_to_string(marker_file).context("Failed to read version marker")?;
        Ok(Some(version.trim().to_string()))
    } else {
        Ok(None)
  }
}

fn has_any_file_with_suffix(dir: &Path, suffix: &str) -> bool {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(Result::ok)
        .any(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .to_string_lossy()
                    .ends_with(suffix)
        })
}

fn jar_contains_mcmeta(jar_path: &Path) -> Result<bool> {
    let jar_file = fs::File::open(jar_path).context("Failed to open Minecraft JAR file")?;
    let mut archive = ZipArchive::new(jar_file).context("Failed to read JAR archive")?;

    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .context("Failed to read archive entry")?;
        let file_path = file.name();

        if file_path.starts_with("assets/minecraft/textures/")
            && file_path.ends_with(".png.mcmeta")
        {
            return Ok(true);
        }
    }

    Ok(false)
}

fn is_cache_complete(cache_dir: &Path, jar_path: &Path) -> Result<bool> {
    let textures_dir = cache_dir.join("assets/minecraft/textures");
    let models_dir = cache_dir.join("assets/minecraft/models");
    let blockstates_dir = cache_dir.join("assets/minecraft/blockstates");
    let particles_dir = cache_dir.join("assets/minecraft/particles");

    if !textures_dir.exists()
        || !models_dir.exists()
        || !blockstates_dir.exists()
        || !particles_dir.exists()
    {
        return Ok(false);
    }

    let has_textures = has_any_file_with_suffix(&textures_dir, ".png");
    let has_models = has_any_file_with_suffix(&models_dir, ".json");
    let has_blockstates = has_any_file_with_suffix(&blockstates_dir, ".json");
    let has_particles = has_any_file_with_suffix(&particles_dir, ".json");

    if !(has_textures && has_models && has_blockstates && has_particles) {
        return Ok(false);
    }

    let has_mcmeta = has_any_file_with_suffix(&textures_dir, ".png.mcmeta");
    if has_mcmeta {
        return Ok(true);
    }

    let jar_has_mcmeta = jar_contains_mcmeta(jar_path)?;
    if jar_has_mcmeta {
        println!("[vanilla_textures] Cache missing .png.mcmeta files");
        return Ok(false);
    }

    println!("[vanilla_textures] No .png.mcmeta files found in jar");
    Ok(true)
}

/// Extract vanilla textures from the Minecraft JAR to cache
pub fn extract_vanilla_textures(jar_path: &Path) -> Result<PathBuf> {
    extract_vanilla_textures_with_progress(jar_path, None)
}

/// Extract vanilla textures with optional progress callback
pub fn extract_vanilla_textures_with_progress(
    jar_path: &Path,
    progress_callback: Option<ProgressCallback>,
) -> Result<PathBuf> {
    let cache_dir = get_vanilla_cache_dir()?;

    // Extract version name from jar path
    let version_name = jar_path
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .ok_or_else(|| anyhow!("Could not determine version name from JAR path"))?;

    // Check if already extracted with this version
    let marker_file = cache_dir.join(".extracted_version");
    if marker_file.exists() {
        if let Ok(cached_version) = fs::read_to_string(&marker_file) {
            if cached_version.trim() == version_name {
                if is_cache_complete(&cache_dir, jar_path)? {
                    println!("[vanilla_textures] Version {} already cached", version_name);
                    return Ok(cache_dir);
                }
                println!(
                    "[vanilla_textures] Cache missing required assets for {}, re-extracting",
                    version_name
                );
            }
        }
    }

    // Clean old cache if it exists
    if cache_dir.exists() {
        println!(
            "[vanilla_textures] Cleaning old cache to extract version {}",
            version_name
        );
        fs::remove_dir_all(&cache_dir).context("Failed to clean old cache")?;
        fs::create_dir_all(&cache_dir).context("Failed to recreate cache directory")?;
    }

    // First pass: collect all files that need to be extracted
    let jar_file = fs::File::open(jar_path).context("Failed to open Minecraft JAR file")?;
    let mut archive = ZipArchive::new(jar_file).context("Failed to read JAR archive")?;

    let mut files_to_extract = Vec::new();

    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .context("Failed to read archive entry")?;

        let file_path = file.name().to_string();

        // Extract textures (PNG), animation metadata (PNG.MCMETA), models (JSON), blockstates (JSON), and particles (JSON)
        let should_extract = (file_path.starts_with("assets/minecraft/textures/")
            && (file_path.ends_with(".png") || file_path.ends_with(".png.mcmeta")))
            || (file_path.starts_with("assets/minecraft/models/") && file_path.ends_with(".json"))
            || (file_path.starts_with("assets/minecraft/blockstates/")
                && file_path.ends_with(".json"))
            || (file_path.starts_with("assets/minecraft/particles/")
                && file_path.ends_with(".json"));

        if should_extract {
            files_to_extract.push((i, file_path));
        }
    }

    let total_files = files_to_extract.len();
    println!(
        "[vanilla_textures] Found {} files to extract, extracting in PARALLEL",
        total_files
    );

    // Report initial progress
    if let Some(ref callback) = progress_callback {
        callback(0, total_files);
    }

    // Second pass: extract files in parallel using chunked batches
    // This is much faster than opening the JAR for each file
    let jar_path_clone = jar_path.to_path_buf();
    let cache_dir_clone = cache_dir.clone();
    let extracted_count = Arc::new(AtomicUsize::new(0));
    let progress_callback_clone = progress_callback.clone();

    // Determine optimal chunk size based on CPU count
    let num_threads = rayon::current_num_threads();
    let chunk_size = (total_files + num_threads - 1) / num_threads; // Ceiling division

    let extraction_result: Result<()> =
        files_to_extract
            .par_chunks(chunk_size)
            .try_for_each(|chunk| -> Result<()> {
                // Open JAR once per chunk (per thread)
                let jar_file =
                    fs::File::open(&jar_path_clone).context("Failed to open Minecraft JAR file")?;
                let mut archive =
                    ZipArchive::new(jar_file).context("Failed to read JAR archive")?;

                // Process all files in this chunk
                for (index, file_path) in chunk {
                    let mut file = archive
                        .by_index(*index)
                        .context("Failed to read archive entry")?;

                    // Keep the full structure: assets/minecraft/...
                    let output_path = cache_dir_clone.join(file_path);

                    // Create parent directories
                    if let Some(parent) = output_path.parent() {
                        fs::create_dir_all(parent).context("Failed to create directory")?;
                    }

                    // Extract the file
                    let mut output_file =
                        fs::File::create(&output_path).context("Failed to create file")?;
                    std::io::copy(&mut file, &mut output_file).context("Failed to write file")?;

                    // Update progress
                    let count = extracted_count.fetch_add(1, Ordering::Relaxed) + 1;
                    if let Some(ref callback) = progress_callback_clone {
                        // Report progress every 50 files or on completion
                        if count % 50 == 0 || count == total_files {
                            callback(count, total_files);
                        }
                    }
                }

                Ok(())
            });

    // Check if extraction succeeded
    if let Err(e) = extraction_result {
        eprintln!("[vanilla_textures] ERROR during extraction: {}", e);
        return Err(e);
    }

    println!("[vanilla_textures] All files extracted successfully");

    // Create marker file with version name
    println!(
        "[vanilla_textures] Writing marker file for version: {}",
        version_name
    );
    fs::write(&marker_file, version_name).context("Failed to create extraction marker")?;
    println!(
        "[vanilla_textures] Marker file written to: {}",
        marker_file.display()
    );

    println!(
        "[vanilla_textures] Successfully extracted vanilla assets for version {} (textures, .mcmeta, models, blockstates, particles) in PARALLEL",
        version_name
    );
    Ok(cache_dir)
}

/// Get the path to a vanilla texture file by asset ID
/// Example: "minecraft:block/stone" -> cache_dir/assets/minecraft/textures/block/stone.png
pub fn get_vanilla_texture_path(asset_id: &str) -> Result<PathBuf> {
    let cache_dir = get_vanilla_cache_dir()?;

    // Parse asset ID: "minecraft:block/stone" -> "block/stone"
    let texture_path = asset_id.strip_prefix("minecraft:").unwrap_or(asset_id);

    // New structure includes full assets/minecraft path
    let full_path = cache_dir.join(format!("assets/minecraft/textures/{}.png", texture_path));

    if full_path.exists() {
        Ok(full_path)
    } else {
        Err(anyhow!("Vanilla texture not found: {}", asset_id))
    }
}

/// Get the path to a vanilla texture's .mcmeta file by asset ID
/// Example: "minecraft:block/magma" -> cache_dir/assets/minecraft/textures/block/magma.png.mcmeta
/// Returns None if the .mcmeta file doesn't exist (not all textures have animation metadata)
pub fn get_vanilla_mcmeta_path(asset_id: &str) -> Result<Option<PathBuf>> {
    let cache_dir = get_vanilla_cache_dir()?;

    // Parse asset ID: "minecraft:block/magma" -> "block/magma"
    let texture_path = asset_id.strip_prefix("minecraft:").unwrap_or(asset_id);

    // .mcmeta files are named like the texture with .mcmeta appended
    let mcmeta_path = cache_dir.join(format!(
        "assets/minecraft/textures/{}.png.mcmeta",
        texture_path
    ));

    if mcmeta_path.exists() {
        Ok(Some(mcmeta_path))
    } else {
        Ok(None)
    }
}

/// Get the path to a biome colormap file (grass.png or foliage.png)
/// Example: "grass" -> cache_dir/assets/minecraft/textures/colormap/grass.png
pub fn get_colormap_path(colormap_type: &str) -> Result<PathBuf> {
    let cache_dir = get_vanilla_cache_dir()?;
    let full_path = cache_dir.join(format!(
        "assets/minecraft/textures/colormap/{}.png",
        colormap_type
    ));

    if full_path.exists() {
        Ok(full_path)
    } else {
        Err(anyhow!("Colormap not found: {}", colormap_type))
    }
}

/// Initialize vanilla textures from a specific Minecraft directory
pub fn initialize_vanilla_textures_from_dir(mc_dir: &Path) -> Result<PathBuf> {
    initialize_vanilla_textures_from_dir_with_progress(mc_dir, None)
}

/// Initialize vanilla textures from a specific Minecraft directory with progress
pub fn initialize_vanilla_textures_from_dir_with_progress(
    mc_dir: &Path,
    progress_callback: Option<ProgressCallback>,
) -> Result<PathBuf> {
    let cache_dir = get_vanilla_cache_dir()?;

    // If already extracted, return cache dir
    if get_cached_version()?.is_some() {
        return Ok(cache_dir);
    }

    // Find and extract from latest version JAR in the given directory
    let jar_path = find_latest_version_jar_from_dir(mc_dir)?;
    extract_vanilla_textures_with_progress(&jar_path, progress_callback)
}

/// Initialize vanilla textures (extract if not already cached)
pub fn initialize_vanilla_textures() -> Result<PathBuf> {
    initialize_vanilla_textures_with_progress(None)
}

/// Initialize vanilla textures with progress callback
pub fn initialize_vanilla_textures_with_progress(
    progress_callback: Option<ProgressCallback>,
) -> Result<PathBuf> {
    let cache_dir = get_vanilla_cache_dir()?;

    // If already extracted, return cache dir
    if get_cached_version()?.is_some() {
        return Ok(cache_dir);
    }

    // Find and extract from latest version JAR
    let jar_path = find_latest_version_jar()?;
    extract_vanilla_textures_with_progress(&jar_path, progress_callback)
}

/// Extract vanilla textures for a specific version
pub fn extract_vanilla_textures_for_version(version: &str) -> Result<PathBuf> {
    extract_vanilla_textures_for_version_with_progress(version, None)
}

/// Extract vanilla textures for a specific version with progress callback
pub fn extract_vanilla_textures_for_version_with_progress(
    version: &str,
    progress_callback: Option<ProgressCallback>,
) -> Result<PathBuf> {
    // Find all available versions
    let versions = list_all_available_versions()?;

    // Find the requested version
    let target_version = versions
        .iter()
        .find(|v| v.version == version)
        .ok_or_else(|| anyhow!("Version {} not found", version))?;

    // Extract textures for this version
    extract_vanilla_textures_with_progress(
        &PathBuf::from(&target_version.jar_path),
        progress_callback,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_vanilla_cache_dir() {
        let cache_dir = get_vanilla_cache_dir();
        assert!(cache_dir.is_ok());
    }

    #[test]
    fn test_find_latest_version_jar() {
        // This test requires a Minecraft installation
        let result = find_latest_version_jar();
        if result.is_ok() {
            println!("Found JAR: {:?}", result.unwrap());
        }
    }

    #[test]
    fn test_get_suggested_paths() {
        let paths = get_suggested_minecraft_paths();
        assert!(!paths.is_empty());
    }
}
