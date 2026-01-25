use anyhow::{anyhow, Context, Result};
use once_cell::sync::Lazy;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::sync::Mutex;

use super::block_particle_extractor::{
    clear_block_emissions_cache, clear_block_emissions_data_cache, extract_block_emissions,
    load_cached_block_emissions, ExtractedBlockEmissions,
};
use super::particle_data::{
    clear_particle_data_cache, extract_particle_textures, get_particle_data_for_version,
    ParticleData as ParticleTextureData,
};
use super::particle_physics_extractor::{
    clear_physics_cache, clear_physics_data_cache, extract_particle_physics,
    load_cached_physics_data, ExtractedPhysicsData,
};
use super::particle_typescript_gen::generate_particle_data_typescript;
use super::vanilla_textures;

#[derive(Debug)]
pub struct ParticleCacheData {
    pub version: String,
    pub physics: ExtractedPhysicsData,
    pub emissions: ExtractedBlockEmissions,
    pub textures: ParticleTextureData,
}

// Serialize particle extraction work so we don't spawn multiple CFR JVMs in parallel.
static PARTICLE_CACHE_MUTEX: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

fn is_project_root(path: &Path) -> bool {
    path.join("src/constants/particles").exists()
}

fn resolve_project_root() -> Result<PathBuf> {
    let cwd = std::env::current_dir().context("Failed to get current directory")?;
    if is_project_root(&cwd) {
        return Ok(cwd);
    }
    if cwd.ends_with("src-tauri") {
        if let Some(parent) = cwd.parent() {
            if is_project_root(parent) {
                return Ok(parent.to_path_buf());
            }
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut candidate = exe.parent();
        for _ in 0..3 {
            if let Some(dir) = candidate {
                if let Some(parent) = dir.parent() {
                    if is_project_root(parent) {
                        return Ok(parent.to_path_buf());
                    }
                    candidate = Some(parent);
                }
            }
        }
    }

    Ok(cwd)
}

pub fn resolve_generated_ts_path() -> Result<PathBuf> {
    let root = resolve_project_root()?;
    Ok(root.join("src/constants/particles/generated.ts"))
}

pub fn resolve_cached_version() -> Result<String> {
    vanilla_textures::get_cached_version()
        .context("Failed to read cached vanilla version")?
        .ok_or_else(|| anyhow!("No cached vanilla version found"))
}

pub fn resolve_jar_path(version: &str) -> Result<PathBuf> {
    let versions = vanilla_textures::list_all_available_versions()
        .context("Failed to list available Minecraft versions")?;
    let version_info = versions
        .iter()
        .find(|v| v.version == version)
        .ok_or_else(|| anyhow!("Version not found: {}", version))?;
    Ok(PathBuf::from(&version_info.jar_path))
}

pub fn load_cached_particle_cache(version: &str) -> Result<Option<ParticleCacheData>> {
    let physics = match load_cached_physics_data(version)? {
        Some(data) => data,
        None => return Ok(None),
    };
    if physics.version != version {
        return Ok(None);
    }

    let emissions = match load_cached_block_emissions(version)? {
        Some(data) => data,
        None => return Ok(None),
    };
    if emissions.version != version {
        return Ok(None);
    }

    let textures = match get_particle_data_for_version(version) {
        Ok(data) => data,
        Err(_) => return Ok(None),
    };
    if textures.version != version {
        return Ok(None);
    }

    Ok(Some(ParticleCacheData {
        version: version.to_string(),
        physics,
        emissions,
        textures,
    }))
}

pub fn clear_particle_caches(version: &str) -> Result<()> {
    clear_physics_cache(version)?;
    clear_block_emissions_cache(version)?;
    clear_particle_data_cache(version)
        .context("Failed to clear particle texture cache")?;
    Ok(())
}

pub fn clear_particle_data_caches(version: &str) -> Result<()> {
    clear_physics_data_cache(version)?;
    clear_block_emissions_data_cache(version)?;
    clear_particle_data_cache(version)
        .context("Failed to clear particle texture cache")?;
    Ok(())
}

pub async fn ensure_particle_cache(
    version: &str,
    jar_path: &Path,
) -> Result<ParticleCacheData> {
    let _guard = PARTICLE_CACHE_MUTEX.lock().await;
    let physics = match load_cached_physics_data(version)? {
        Some(data) if data.version == version => data,
        _ => extract_particle_physics(jar_path, version)
            .await
            .context("Failed to extract particle physics")?,
    };

    let emissions = match load_cached_block_emissions(version)? {
        Some(data) if data.version == version => data,
        _ => extract_block_emissions(jar_path, version)
            .await
            .context("Failed to extract block emissions")?,
    };

    let textures = match get_particle_data_for_version(version) {
        Ok(data) if data.version == version => data,
        _ => extract_particle_textures(jar_path, version)
            .context("Failed to extract particle texture mappings")?,
    };

    Ok(ParticleCacheData {
        version: version.to_string(),
        physics,
        emissions,
        textures,
    })
}

pub async fn rebuild_particle_cache(
    version: &str,
    jar_path: &Path,
    full: bool,
) -> Result<ParticleCacheData> {
    let _guard = PARTICLE_CACHE_MUTEX.lock().await;
    if full {
        clear_particle_caches(version)?;
    } else {
        clear_particle_data_caches(version)?;
    }

    let physics = extract_particle_physics(jar_path, version)
        .await
        .context("Failed to extract particle physics")?;
    let emissions = extract_block_emissions(jar_path, version)
        .await
        .context("Failed to extract block emissions")?;
    let textures = extract_particle_textures(jar_path, version)
        .context("Failed to extract particle texture mappings")?;

    Ok(ParticleCacheData {
        version: version.to_string(),
        physics,
        emissions,
        textures,
    })
}

pub async fn ensure_particle_typescript(
    version: &str,
    jar_path: &Path,
    output_path: &Path,
) -> Result<ParticleCacheData> {
    let data = ensure_particle_cache(version, jar_path).await?;
    generate_particle_data_typescript(
        &data.physics,
        &data.emissions,
        &data.textures,
        output_path,
    )?;
    Ok(data)
}

pub async fn rebuild_particle_typescript(
    version: &str,
    jar_path: &Path,
    output_path: &Path,
    full: bool,
) -> Result<ParticleCacheData> {
    if output_path.exists() {
        fs::remove_file(output_path).context("Failed to remove stale generated.ts")?;
    }

    let data = rebuild_particle_cache(version, jar_path, full).await?;
    generate_particle_data_typescript(
        &data.physics,
        &data.emissions,
        &data.textures,
        output_path,
    )?;
    Ok(data)
}

pub async fn ensure_particle_typescript_for_cached_version() -> Result<ParticleCacheData> {
    let version = resolve_cached_version()?;
    let jar_path = resolve_jar_path(&version)?;
    let output_path = resolve_generated_ts_path()?;
    ensure_particle_typescript(&version, &jar_path, &output_path).await
}

pub async fn rebuild_particle_typescript_for_cached_version(
    full: bool,
) -> Result<ParticleCacheData> {
    let version = resolve_cached_version()?;
    let jar_path = resolve_jar_path(&version)?;
    let output_path = resolve_generated_ts_path()?;
    rebuild_particle_typescript(&version, &jar_path, &output_path, full).await
}
