/// Particle Physics Extractor
///
/// Extracts particle physics data (lifetime, gravity, size, etc.) from
/// Minecraft's decompiled source code using Mojang's official mappings.
///
/// This data is NOT bundled with the app - it's extracted on-demand
/// from the user's Minecraft installation.
use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Command;

/// Extracted particle physics data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedParticlePhysics {
    /// Lifetime range in game ticks [min, max] (20 ticks = 1 second)
    pub lifetime: Option<[i32; 2]>,
    /// Gravity value (negative = rises, positive = falls)
    pub gravity: Option<f32>,
    /// Initial size (quad size) when explicitly set in the constructor.
    ///
    /// Note: Most sprite particles derive their starting `quadSize` from the
    /// `SingleQuadParticle` constructor's random formula; in those cases this
    /// will be `None` and `scale` should be used instead.
    pub size: Option<f32>,
    /// Scale multiplier applied via `Particle.scale(...)` or constructor scale params.
    ///
    /// This is a multiplier applied on top of the base `quadSize` (which is often randomized).
    pub scale: Option<f32>,
    /// Whether the particle has physics (collision)
    pub has_physics: Option<bool>,
    /// Initial alpha/opacity
    pub alpha: Option<f32>,
    /// Friction/drag coefficient
    pub friction: Option<f32>,
    /// Velocity multipliers applied in the particle constructor (per-axis)
    /// These operate on the particle's initial (xd, yd, zd) values.
    pub velocity_multiplier: Option<[f32; 3]>,
    /// Constant velocity added in the particle constructor (per-axis)
    pub velocity_add: Option<[f32; 3]>,
    /// Random velocity added in the particle constructor (per-axis)
    /// Interpreted as `(rand(-0.5..0.5) * value)` per axis.
    pub velocity_jitter: Option<[f32; 3]>,
    /// Base RGB color (0..1) assigned in the particle constructor
    pub color: Option<[f32; 3]>,
    /// BaseAshSmokeParticle grayscale color scale (random.nextFloat() * color_scale).
    pub color_scale: Option<f32>,
    /// BaseAshSmokeParticle base lifetime parameter (used in its lifetime formula).
    pub lifetime_base: Option<i32>,
    /// If true, animation frames map to lifetime/age (SpriteSet.get(age, lifetime)).
    pub lifetime_animation: Option<bool>,
    /// High-level behavior identifier (e.g., "particle", "rising", "ash_smoke", "flame").
    pub behavior: Option<String>,
    /// Velocity delta applied each tick [dx, dy, dz] (from tick() method analysis)
    /// Used for particles that accelerate or have special movement patterns.
    pub tick_velocity_delta: Option<[f32; 3]>,
    /// Particles spawned by this particle during its tick() method
    /// Format: Vec<(particle_id, probability_expr, count_expr)>
    /// Example: lava particle spawns smoke with 10% probability
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spawns_particles: Option<Vec<SpawnedParticle>>,
    /// Whether this particle skips friction (overrides tick() without calling super)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skips_friction: Option<bool>,
    /// Whether this particle uses static random texture (picks one texture and keeps it)
    /// Detected by ParticleProvider passing a single TextureAtlasSprite to constructor
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uses_static_texture: Option<bool>,
}

/// Particle spawned by another particle during tick()
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnedParticle {
    pub particle_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub probability_expr: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count_expr: Option<String>,
}

/// All extracted physics for a Minecraft version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedPhysicsData {
    /// Schema version for cache compatibility
    #[serde(default)]
    pub schema_version: u32,
    pub version: String,
    pub particles: HashMap<String, ExtractedParticlePhysics>,
}

/// Parse vanilla Minecraft version from potentially modded version string
///
/// Examples:
/// - "1.21.4" -> "1.21.4"
/// - "1.21.4-fabric" -> "1.21.4"
/// - "1.21.4-fabric-0.16.5" -> "1.21.4"
/// - "1.21.10-0.18.1" -> "1.21.10" (Fabric format)
/// - "1.20.1-forge-47.2.0" -> "1.20.1"
fn parse_vanilla_version(version: &str) -> String {
    // Split by hyphen to separate version from loader info
    let parts: Vec<&str> = version.split('-').collect();
    let base = parts[0];

    // Check if base is already a valid vanilla version (X.Y or X.Y.Z format)
    let base_parts: Vec<&str> = base.split('.').collect();
    if base_parts.len() >= 2 && base_parts.len() <= 3 {
        // Check all parts are numeric
        let all_numeric = base_parts.iter().all(|p| p.parse::<u32>().is_ok());
        if all_numeric {
            // Minecraft versions like 1.21.10 are valid - don't try to "fix" them
            return base.to_string();
        }
    }

    // Fallback: try to extract version pattern from anywhere in the string
    let re = regex::Regex::new(r"(\d+\.\d+(?:\.\d+)?)").unwrap();
    if let Some(caps) = re.captures(version) {
        return caps.get(1).unwrap().as_str().to_string();
    }

    // Last resort: return original
    version.to_string()
}

/// Mojang version manifest structure
#[derive(Debug, Deserialize)]
struct VersionManifest {
    versions: Vec<VersionEntry>,
}

#[derive(Debug, Deserialize)]
struct VersionEntry {
    id: String,
    url: String,
}

/// Version-specific JSON structure (partial)
#[derive(Debug, Deserialize)]
struct VersionJson {
    downloads: VersionDownloads,
}

#[derive(Debug, Deserialize)]
struct VersionDownloads {
    client_mappings: Option<DownloadInfo>,
}

#[derive(Debug, Deserialize)]
struct DownloadInfo {
    url: String,
    #[allow(dead_code)]
    sha1: String,
}

/// Get the cache directory for particle physics extraction
fn get_physics_cache_dir() -> Result<PathBuf> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Could not find cache directory"))?
        .join("weaverbird")
        .join("particle_physics");

    fs::create_dir_all(&cache_dir).context("Failed to create particle physics cache directory")?;

    Ok(cache_dir)
}

/// Get the cache file path for extracted physics data
fn get_physics_cache_file(version: &str) -> Result<PathBuf> {
    let cache_dir = get_physics_cache_dir()?;
    Ok(cache_dir.join(format!("{}.json", version)))
}

/// Check if physics data is cached for a version
pub fn is_physics_data_cached(version: &str) -> Result<bool> {
    // Treat older-schema cache files as "not cached" so callers trigger re-extraction.
    Ok(load_cached_physics_data(version)?.is_some())
}

/// Load cached physics data
pub fn load_cached_physics_data(version: &str) -> Result<Option<ExtractedPhysicsData>> {
    let cache_file = get_physics_cache_file(version)?;

    if !cache_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&cache_file).context("Failed to read physics cache file")?;
    let data: ExtractedPhysicsData =
        serde_json::from_str(&content).context("Failed to parse physics cache file")?;

    // If the cache is from an older schema, force re-extraction to populate new fields.
    const CURRENT_SCHEMA_VERSION: u32 = 5;
    if data.schema_version < CURRENT_SCHEMA_VERSION {
        println!(
            "[particle_physics] Cached physics schema {} is older than {}, re-extracting...",
            data.schema_version, CURRENT_SCHEMA_VERSION
        );
        return Ok(None);
    }

    Ok(Some(data))
}

/// Save physics data to cache
fn save_physics_data_to_cache(data: &ExtractedPhysicsData) -> Result<()> {
    let cache_file = get_physics_cache_file(&data.version)?;
    let content = serde_json::to_string_pretty(data).context("Failed to serialize physics data")?;
    fs::write(&cache_file, content).context("Failed to write physics cache file")?;

    println!(
        "[particle_physics] Cached physics data for version {} ({} particles)",
        data.version,
        data.particles.len()
    );

    Ok(())
}

// NOTE: Deprecated - particle physics is now generated as part of the combined
// TypeScript file in particle_typescript_gen.rs instead of individually.

/// Download Mojang mappings for a version
pub async fn download_mojang_mappings(version: &str) -> Result<PathBuf> {
    // Parse vanilla version from potentially modded version string
    let vanilla_version = parse_vanilla_version(version);

    let cache_dir = get_physics_cache_dir()?;
    // Cache with original version name but download using vanilla version
    let mappings_file = cache_dir.join(format!("{}-mappings.txt", version));

    // Check if already downloaded
    if mappings_file.exists() {
        println!(
            "[particle_physics] Using cached mappings for {}",
            version
        );
        return Ok(mappings_file);
    }

    println!(
        "[particle_physics] Downloading Mojang mappings for {} (vanilla: {})...",
        version, vanilla_version
    );

    // Step 1: Fetch version manifest
    let manifest_url = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
    let manifest_response = reqwest::get(manifest_url)
        .await
        .context("Failed to fetch version manifest")?;
    let manifest: VersionManifest = manifest_response
        .json()
        .await
        .context("Failed to parse version manifest")?;

    // Step 2: Find the version URL using vanilla version
    let version_entry = manifest
        .versions
        .iter()
        .find(|v| v.id == vanilla_version)
        .ok_or_else(|| anyhow!("Version {} (vanilla: {}) not found in manifest", version, vanilla_version))?;

    // Step 3: Fetch version JSON
    let version_response = reqwest::get(&version_entry.url)
        .await
        .context("Failed to fetch version JSON")?;
    let version_json: VersionJson = version_response
        .json()
        .await
        .context("Failed to parse version JSON")?;

    // Step 4: Get mappings URL
    let mappings_info = version_json
        .downloads
        .client_mappings
        .ok_or_else(|| anyhow!("No client mappings available for version {}", version))?;

    // Step 5: Download mappings
    let mappings_response = reqwest::get(&mappings_info.url)
        .await
        .context("Failed to download mappings")?;
    let mappings_content = mappings_response
        .bytes()
        .await
        .context("Failed to read mappings content")?;

    // Save to cache
    fs::write(&mappings_file, &mappings_content).context("Failed to save mappings file")?;

    println!(
        "[particle_physics] Downloaded mappings for {} ({} bytes)",
        version,
        mappings_content.len()
    );

    Ok(mappings_file)
}

/// Field mappings for the Particle base class
/// Maps deobfuscated field name to obfuscated name
#[derive(Debug, Default, Clone)]
pub struct ParticleFieldMappings {
    pub lifetime: Option<String>,
    pub gravity: Option<String>,
    pub has_physics: Option<String>,
    pub friction: Option<String>,
    // SingleQuadParticle fields (used by most sprite-based particles)
    pub quad_size: Option<String>,
    pub alpha: Option<String>,
    pub r_col: Option<String>,
    pub g_col: Option<String>,
    pub b_col: Option<String>,
    pub xd: Option<String>,
    pub yd: Option<String>,
    pub zd: Option<String>,
}

/// Parse Mojang mappings file to get class and field mappings
fn parse_mappings(mappings_path: &Path) -> Result<(HashMap<String, String>, ParticleFieldMappings)> {
    let file = fs::File::open(mappings_path).context("Failed to open mappings file")?;
    let reader = BufReader::new(file);

    let mut class_mappings = HashMap::new();
    let mut particle_fields = ParticleFieldMappings::default();
    let mut in_particle_class = false;
    let mut in_single_quad_particle_class = false;

    for line in reader.lines() {
        let line = line.context("Failed to read line")?;

        // Class mappings look like:
        // net.minecraft.client.particle.FlameParticle -> abc:
        if line.ends_with(':') && !line.starts_with(' ') {
            let parts: Vec<&str> = line.trim_end_matches(':').split(" -> ").collect();
            if parts.len() == 2 {
                let deobfuscated = parts[0];
                let obfuscated = parts[1].to_string();
                class_mappings.insert(obfuscated, deobfuscated.to_string());
                // Check if this is the base Particle class
                in_particle_class = deobfuscated == "net.minecraft.client.particle.Particle";
                in_single_quad_particle_class =
                    deobfuscated == "net.minecraft.client.particle.SingleQuadParticle";
            }
        }
        // Field mappings look like (indented with 4 spaces):
        //     int lifetime -> t
        //     float gravity -> u
        else if line.starts_with("    ") && !line.contains('(') && (in_particle_class || in_single_quad_particle_class) {
            // This is a field mapping (methods have parentheses)
            let trimmed = line.trim();
            let parts: Vec<&str> = trimmed.split(" -> ").collect();
            if parts.len() == 2 {
                // Format: "type fieldName -> obfName"
                let type_and_name = parts[0];
                let obf_name = parts[1].to_string();

                // Extract field name (last word before ->)
                let words: Vec<&str> = type_and_name.split_whitespace().collect();
                if words.len() >= 2 {
                    let field_name = words[words.len() - 1];

                    if in_particle_class {
                        // Base Particle fields
                        match field_name {
                            "lifetime" => particle_fields.lifetime = Some(obf_name),
                            "gravity" => particle_fields.gravity = Some(obf_name),
                            "hasPhysics" => particle_fields.has_physics = Some(obf_name),
                            "friction" => particle_fields.friction = Some(obf_name),
                            "xd" => particle_fields.xd = Some(obf_name),
                            "yd" => particle_fields.yd = Some(obf_name),
                            "zd" => particle_fields.zd = Some(obf_name),
                            _ => {}
                        }
                    } else if in_single_quad_particle_class {
                        // SingleQuadParticle fields (rendering)
                        match field_name {
                            "quadSize" => particle_fields.quad_size = Some(obf_name),
                            "rCol" => particle_fields.r_col = Some(obf_name),
                            "gCol" => particle_fields.g_col = Some(obf_name),
                            "bCol" => particle_fields.b_col = Some(obf_name),
                            "alpha" => particle_fields.alpha = Some(obf_name),
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    println!(
        "[particle_physics] Parsed {} class mappings",
        class_mappings.len()
    );
    println!(
        "[particle_physics] Particle field mappings: lifetime={:?}, gravity={:?}, hasPhysics={:?}, friction={:?}, xd={:?}, yd={:?}, zd={:?}, quadSize={:?}, rCol={:?}, gCol={:?}, bCol={:?}, alpha={:?}",
        particle_fields.lifetime,
        particle_fields.gravity,
        particle_fields.has_physics,
        particle_fields.friction,
        particle_fields.xd,
        particle_fields.yd,
        particle_fields.zd,
        particle_fields.quad_size
        , particle_fields.r_col
        , particle_fields.g_col
        , particle_fields.b_col
        , particle_fields.alpha
    );

    Ok((class_mappings, particle_fields))
}

/// Known particle classes and their corresponding particle type IDs
/// This maps the deobfuscated class name to the particle type
fn get_particle_class_mappings() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();

    // Base classes - extract physics from these as they're inherited by many particles
    map.insert("net.minecraft.client.particle.Particle", "__base_particle");
    map.insert("net.minecraft.client.particle.RisingParticle", "__base_rising");
    map.insert("net.minecraft.client.particle.SimpleAnimatedParticle", "__base_simple_animated");
    map.insert("net.minecraft.client.particle.BaseAshSmokeParticle", "__base_ash_smoke");
    map.insert("net.minecraft.client.particle.TextureSheetParticle", "__base_texture_sheet");

    // Fire & Flame
    map.insert("net.minecraft.client.particle.FlameParticle", "flame");
    map.insert("net.minecraft.client.particle.SoulParticle", "soul_fire_flame");
    map.insert("net.minecraft.client.particle.LavaParticle", "lava");
    map.insert("net.minecraft.client.particle.CandleFlameParticle", "candle_flame");

    // Smoke
    map.insert("net.minecraft.client.particle.SmokeParticle", "smoke");
    map.insert("net.minecraft.client.particle.LargeSmokeParticle", "large_smoke");
    map.insert("net.minecraft.client.particle.CampfireSmokeParticle", "campfire_cosy_smoke");
    map.insert("net.minecraft.client.particle.WhiteAshParticle", "white_ash");

    // Effects
    map.insert("net.minecraft.client.particle.SpellParticle", "effect");
    map.insert("net.minecraft.client.particle.CritParticle", "crit");
    map.insert("net.minecraft.client.particle.HeartParticle", "heart");
    map.insert("net.minecraft.client.particle.NoteParticle", "note");
    map.insert("net.minecraft.client.particle.DamageIndicatorParticle", "damage_indicator");
    map.insert("net.minecraft.client.particle.EnchantmentTableParticle", "enchant");
    map.insert("net.minecraft.client.particle.TotemParticle", "totem_of_undying");
    map.insert("net.minecraft.client.particle.HugeExplosionParticle", "explosion");
    map.insert("net.minecraft.client.particle.HugeExplosionSeedParticle", "explosion_emitter");

    // Portal
    map.insert("net.minecraft.client.particle.PortalParticle", "portal");
    map.insert("net.minecraft.client.particle.ReversePortalParticle", "reverse_portal");

    // End
    map.insert("net.minecraft.client.particle.EndRodParticle", "end_rod");
    map.insert("net.minecraft.client.particle.DragonBreathParticle", "dragon_breath");

    // Drip
    map.insert("net.minecraft.client.particle.DripParticle", "dripping_water");

    // Bubbles
    map.insert("net.minecraft.client.particle.BubbleParticle", "bubble");
    map.insert("net.minecraft.client.particle.BubblePopParticle", "bubble_pop");
    map.insert("net.minecraft.client.particle.BubbleColumnUpParticle", "bubble_column_up");
    map.insert("net.minecraft.client.particle.CurrentDownParticle", "current_down");

    // Dust/Particles
    map.insert("net.minecraft.client.particle.DustParticle", "dust");
    map.insert("net.minecraft.client.particle.DustColorTransitionParticle", "dust_color_transition");
    map.insert("net.minecraft.client.particle.DustPlumeParticle", "dust_plume");
    map.insert("net.minecraft.client.particle.FallingDustParticle", "falling_dust");

    // Water
    map.insert("net.minecraft.client.particle.SplashParticle", "splash");
    map.insert("net.minecraft.client.particle.SuspendedParticle", "underwater");
    map.insert("net.minecraft.client.particle.SnowflakeParticle", "snowflake");
    map.insert("net.minecraft.client.particle.RainParticle", "rain");
    map.insert("net.minecraft.client.particle.WaterDropParticle", "falling_water");

    // Misc
    map.insert("net.minecraft.client.particle.SquidInkParticle", "squid_ink");
    map.insert("net.minecraft.client.particle.GlowParticle", "glow");
    map.insert("net.minecraft.client.particle.WaxOffParticle", "wax_off");
    map.insert("net.minecraft.client.particle.WaxOnParticle", "wax_on");
    map.insert("net.minecraft.client.particle.ScrapeParticle", "scrape");
    map.insert("net.minecraft.client.particle.ElectricSparkParticle", "electric_spark");
    map.insert("net.minecraft.client.particle.VibrationSignalParticle", "vibration");
    map.insert("net.minecraft.client.particle.ShriekParticle", "shriek");
    map.insert("net.minecraft.client.particle.SculkChargeParticle", "sculk_charge");
    map.insert("net.minecraft.client.particle.SculkChargePopParticle", "sculk_charge_pop");
    map.insert("net.minecraft.client.particle.SonicBoomParticle", "sonic_boom");
    map.insert("net.minecraft.client.particle.BlockMarker", "block_marker");
    map.insert("net.minecraft.client.particle.BreakingItemParticle", "item");
    map.insert("net.minecraft.client.particle.TerrainParticle", "block");

    // Sculk
    map.insert("net.minecraft.client.particle.SculkSoulParticle", "sculk_soul");

    // Cherry
    map.insert("net.minecraft.client.particle.CherryParticle", "cherry_leaves");

    // Trail
    map.insert("net.minecraft.client.particle.TrailParticle", "trail");
    map.insert("net.minecraft.client.particle.OminousSpawningParticle", "ominous_spawning");

    // Provider classes - these contain the actual physics values for particles that inherit
    // The Provider's createParticle method instantiates the particle with specific values
    map.insert("net.minecraft.client.particle.FlameParticle$Provider", "__provider_flame");
    map.insert("net.minecraft.client.particle.FlameParticle$SmallFlameProvider", "__provider_small_flame");
    map.insert("net.minecraft.client.particle.SmokeParticle$Provider", "__provider_smoke");
    map.insert("net.minecraft.client.particle.LargeSmokeParticle$Provider", "__provider_large_smoke");
    map.insert("net.minecraft.client.particle.SoulParticle$Provider", "__provider_soul_fire_flame");
    map.insert("net.minecraft.client.particle.SoulParticle$EmissiveProvider", "__provider_soul_fire_flame_emissive");
    map.insert("net.minecraft.client.particle.PortalParticle$Provider", "__provider_portal");
    map.insert("net.minecraft.client.particle.DustParticle$Provider", "__provider_dust");
    map.insert("net.minecraft.client.particle.CampfireSmokeParticle$CosyProvider", "__provider_campfire_cosy");
    map.insert("net.minecraft.client.particle.CampfireSmokeParticle$SignalProvider", "__provider_campfire_signal");

    map
}

/// Default physics values extracted from the base Particle class
/// These are the values used when a particle doesn't explicitly set its own
fn get_base_particle_defaults() -> ExtractedParticlePhysics {
    ExtractedParticlePhysics {
        // Default lifetime: (int)(4.0f / (random * 0.9f + 0.1f)) = ~4-40 ticks
        lifetime: Some([4, 40]),
        // Default gravity: 0 (no gravity)
        gravity: Some(0.0),
        // Default friction: 0.98
        friction: Some(0.98),
        // Default hasPhysics: true
        has_physics: Some(true),
        // Size depends on particle type
        size: None,
        scale: None,
        alpha: None,
        velocity_multiplier: None,
        velocity_add: None,
        velocity_jitter: None,
        color: None,
        color_scale: None,
        lifetime_base: None,
        lifetime_animation: None,
        behavior: Some("particle".to_string()),
        tick_velocity_delta: None,
        spawns_particles: None,
        skips_friction: Some(false), // Base Particle applies friction
        uses_static_texture: None,
    }
}

/// Default physics for RisingParticle base class
fn get_rising_particle_defaults() -> ExtractedParticlePhysics {
    ExtractedParticlePhysics {
        // RisingParticle: (int)(8.0 / (Math.random() * 0.8 + 0.2)) + 4 = ~12-44 ticks
        lifetime: Some([12, 44]),
        // RisingParticle doesn't set gravity, inherits 0 from Particle
        gravity: Some(0.0),
        // RisingParticle sets friction to 0.96
        friction: Some(0.96),
        has_physics: Some(true),
        size: None,
        scale: None,
        alpha: None,
        velocity_multiplier: None,
        velocity_add: None,
        velocity_jitter: None,
        color: None,
        color_scale: None,
        lifetime_base: None,
        lifetime_animation: None,
        behavior: Some("rising".to_string()),
        tick_velocity_delta: None,
        spawns_particles: None,
        skips_friction: Some(false), // RisingParticle applies friction
        uses_static_texture: None,
    }
}

/// Default physics for BaseAshSmokeParticle base class
///
/// BaseAshSmokeParticle sets friction and drives sprite animation by age.
/// Other behavior-specific parameters (gravity, base lifetime, color scale, scale)
/// are supplied via the derived class super() call and provider.
fn get_ash_smoke_particle_defaults() -> ExtractedParticlePhysics {
    ExtractedParticlePhysics {
        lifetime: None,
        gravity: None,
        size: None,
        scale: None,
        has_physics: None,
        alpha: None,
        friction: Some(0.96),
        velocity_multiplier: None,
        velocity_add: None,
        velocity_jitter: None,
        color: None,
        color_scale: None,
        lifetime_base: None,
        lifetime_animation: Some(true),
        behavior: Some("ash_smoke".to_string()),
        tick_velocity_delta: None,
        spawns_particles: None,
        skips_friction: Some(false), // BaseAshSmokeParticle applies friction
        uses_static_texture: None,
    }
}

/// Map Provider types to their corresponding particle type
fn get_provider_to_particle_map() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();
    map.insert("__provider_flame", "flame");
    map.insert("__provider_small_flame", "small_flame");
    map.insert("__provider_smoke", "smoke");
    map.insert("__provider_large_smoke", "large_smoke");
    map.insert("__provider_soul_fire_flame", "soul_fire_flame");
    map.insert("__provider_soul_fire_flame_emissive", "soul_fire_flame");
    map.insert("__provider_portal", "portal");
    map.insert("__provider_dust", "dust");
    map.insert("__provider_campfire_cosy", "campfire_cosy_smoke");
    map.insert("__provider_campfire_signal", "campfire_signal_smoke");
    map
}

/// Map of particle types to their base class particle type
/// Used to inherit physics from parent classes when a particle doesn't define its own
fn get_particle_inheritance() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();

    // Particles that extend RisingParticle (inherits friction=0.96, lifetime=12-44)
    map.insert("flame", "__base_rising");
    map.insert("soul_fire_flame", "__base_rising");
    map.insert("candle_flame", "__base_rising");
    map.insert("small_flame", "__base_rising");

    // Particles that extend BaseAshSmokeParticle (passes values via super()).
    // SmokeParticle calls: super(..., 0.3f, 8, -0.1f, true) where `0.3f` is a grayscale color scale,
    // and lifetime is computed from `baseLifetime` and a random divisor (not a constant 8 ticks).
    map.insert("smoke", "__base_ash_smoke");
    map.insert("large_smoke", "__base_ash_smoke");
    map.insert("white_ash", "__base_ash_smoke");

    // Particles that extend SimpleAnimatedParticle
    map.insert("campfire_cosy_smoke", "__base_simple_animated");
    // campfire_signal_smoke inherits from campfire_cosy_smoke to get class physics
    // (both use CampfireSmokeParticle class, but only cosy is mapped to the class)
    map.insert("campfire_signal_smoke", "campfire_cosy_smoke");
    map.insert("portal", "__base_simple_animated");
    map.insert("reverse_portal", "__base_simple_animated");
    map.insert("end_rod", "__base_simple_animated");
    map.insert("enchant", "__base_simple_animated");
    map.insert("dragon_breath", "__base_simple_animated");
    map.insert("sculk_soul", "__base_simple_animated");
    map.insert("glow", "__base_simple_animated");
    map.insert("totem_of_undying", "__base_simple_animated");

    // Particles that extend TextureSheetParticle directly (base Particle defaults)
    map.insert("heart", "__base_particle");
    map.insert("note", "__base_particle");
    map.insert("crit", "__base_particle");
    map.insert("damage_indicator", "__base_particle");
    map.insert("effect", "__base_particle");
    map.insert("dust", "__base_particle");
    map.insert("dust_color_transition", "__base_particle");
    map.insert("dust_plume", "__base_particle");
    map.insert("falling_dust", "__base_particle");
    map.insert("splash", "__base_particle");
    map.insert("bubble", "__base_particle");
    map.insert("bubble_pop", "__base_particle");
    map.insert("bubble_column_up", "__base_particle");
    map.insert("current_down", "__base_particle");
    map.insert("underwater", "__base_particle");
    map.insert("snowflake", "__base_particle");
    map.insert("rain", "__base_particle");
    map.insert("dripping_water", "__base_particle");
    map.insert("lava", "__base_particle");
    map.insert("squid_ink", "__base_particle");
    map.insert("wax_off", "__base_particle");
    map.insert("wax_on", "__base_particle");
    map.insert("scrape", "__base_particle");
    map.insert("electric_spark", "__base_particle");
    map.insert("cherry_leaves", "__base_particle");
    map.insert("explosion", "__base_particle");
    map.insert("explosion_emitter", "__base_particle");
    map.insert("block", "__base_particle");
    map.insert("item", "__base_particle");
    map.insert("falling_water", "__base_particle");

    map
}

/// Extract physics from super() calls to base classes
///
/// Many particle classes pass physics values through super() constructor calls.
/// For example, SmokeParticle calls:
/// super($$0, $$1, $$2, $$3, 0.1f, 0.1f, 0.1f, $$4, $$5, $$6, $$7, $$8, 0.3f, 8, -0.1f, true);
///                                                           scale sprites color base gravity physics
fn extract_physics_from_super_call(source: &str, field_mappings: &ParticleFieldMappings) -> ExtractedParticlePhysics {
    let mut physics = ExtractedParticlePhysics::default();

    // BaseAshSmokeParticle super() call
    //
    // Signature (1.21.x):
    // super(level, x, y, z,
    //       xMul, yMul, zMul,
    //       xSpeed, ySpeed, zSpeed,
    //       scale, sprites,
    //       colorScale, baseLifetime, gravity, hasPhysics);
    //
    // Example (SmokeParticle):
    // super($$0, $$1, $$2, $$3, 0.1f, 0.1f, 0.1f, $$4, $$5, $$6, $$7, $$8, 0.3f, 8, -0.1f, true);
    fn parse_float(token: &str) -> Option<f32> {
        let mut t = token.trim().to_string();
        for cast in ["(double)", "(float)", "(int)"] {
            t = t.replace(cast, "");
        }
        let t = t.trim().trim_matches(|c| c == '(' || c == ')');
        let t = t.trim_end_matches(|c: char| matches!(c, 'f' | 'F' | 'd' | 'D'));
        t.trim().parse::<f32>().ok()
    }

    fn parse_int(token: &str) -> Option<i32> {
        let mut t = token.trim().to_string();
        for cast in ["(double)", "(float)", "(int)"] {
            t = t.replace(cast, "");
        }
        let t = t.trim().trim_matches(|c| c == '(' || c == ')');
        t.trim().parse::<i32>().ok()
    }

    fn parse_bool(token: &str) -> Option<bool> {
        match token.trim() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        }
    }

    fn parse_args_at(source: &str, start_after_paren: usize) -> Option<Vec<String>> {
        let mut args = Vec::new();
        let mut current = String::new();
        let mut depth: i32 = 0;
        let bytes = source.as_bytes();
        let mut i = start_after_paren;

        while i < bytes.len() {
            let c = bytes[i] as char;
            match c {
                '(' => {
                    depth += 1;
                    current.push(c);
                }
                ')' => {
                    if depth == 0 {
                        let trimmed = current.trim();
                        if !trimmed.is_empty() {
                            args.push(trimmed.to_string());
                        }
                        return Some(args);
                    }
                    depth -= 1;
                    current.push(c);
                }
                ',' if depth == 0 => {
                    args.push(current.trim().to_string());
                    current.clear();
                }
                _ => current.push(c),
            }
            i += 1;
        }
        None
    }

    let super_call_re = Regex::new(r"\bsuper\s*\(").unwrap();
    if let Some(m) = super_call_re.find(source) {
        if let Some(args) = parse_args_at(source, m.end()) {
            if args.len() >= 16 {
                // last 4 args are distinctive for BaseAshSmokeParticle: colorScale, baseLifetime, gravity, hasPhysics
                let color_scale = parse_float(&args[args.len() - 4]);
                let base_lifetime = parse_int(&args[args.len() - 3]);
                let gravity = parse_float(&args[args.len() - 2]);
                let has_physics = parse_bool(&args[args.len() - 1]);

                if color_scale.is_some() && base_lifetime.is_some() && gravity.is_some() && has_physics.is_some() {
                    physics.color_scale = color_scale;
                    physics.lifetime_base = base_lifetime;
                    physics.gravity = gravity;
                    physics.has_physics = has_physics;

                    // x/y/z velocity multipliers are args[4..=6] in BaseAshSmokeParticle signature
                    if let (Some(xm), Some(ym), Some(zm)) = (
                        parse_float(&args[4]),
                        parse_float(&args[5]),
                        parse_float(&args[6]),
                    ) {
                        physics.velocity_multiplier = Some([xm, ym, zm]);
                    }

                    // scale is args[10] and is a per-particle size multiplier; only capture if it's a literal
                    if let Some(scale) = parse_float(&args[10]) {
                        physics.scale = Some(scale);
                    }
                }
            }
        }
    }

    // RisingParticle-style super() - passes through to parent, look for friction setting after
    // Pattern: this.C = 0.96f (friction)
    // Pattern: this.A = (int)(8.0 / (...)) + 4 (lifetime expression)
    if physics.friction.is_none() {
        if let Some(friction_field) = &field_mappings.friction {
            let pattern = format!(r"this\.{}\s*=\s*([\d.]+)[fF]?", regex::escape(friction_field));
            if let Ok(re) = Regex::new(&pattern) {
                if let Some(caps) = re.captures(source) {
                    physics.friction = caps.get(1).and_then(|m| m.as_str().parse().ok());
                }
            }
        }
    }

    // Parse complex lifetime expressions like: this.A = (int)(8.0 / (Math.random() * 0.8 + 0.2)) + 4
    // The base value is the divisor (8.0) and the addend (+4) gives us a range
    if physics.lifetime.is_none() {
        if let Some(lifetime_field) = &field_mappings.lifetime {
            // Pattern for: this.A = (int)(X / (...)) + Y
            let pattern = format!(
                r"this\.{}\s*=\s*\(int\)\s*\(\s*([\d.]+)\s*/",
                regex::escape(lifetime_field)
            );
            if let Ok(re) = Regex::new(&pattern) {
                if let Some(caps) = re.captures(source) {
                    // The divisor is the base lifetime - the actual value varies but averages around divisor * 2
                    let base: f32 = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(8.0);
                    // For (int)(X / (random * 0.8 + 0.2)), min is X/1.0 = X, max is X/0.2 = 5X
                    // But with random involved, practical range is X to ~2.5X
                    let min = base as i32;
                    let max = (base * 2.5) as i32;

                    // Check for + Y at the end
                    let addend_pattern = format!(
                        r"this\.{}\s*=\s*\(int\)[^;]+\)\s*\+\s*(\d+)",
                        regex::escape(lifetime_field)
                    );
                    if let Ok(add_re) = Regex::new(&addend_pattern) {
                        if let Some(add_caps) = add_re.captures(source) {
                            let addend: i32 = add_caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
                            physics.lifetime = Some([min + addend, max + addend]);
                        } else {
                            physics.lifetime = Some([min, max]);
                        }
                    } else {
                        physics.lifetime = Some([min, max]);
                    }
                }
            }
        }
    }

    physics
}

/// Extract physics from a Provider class's createParticle method
///
/// Provider classes instantiate particles with specific physics values.
/// For RisingParticle-based particles, the constructor signature is typically:
/// RisingParticle(level, x, y, z, xSpeed, ySpeed, zSpeed, sprites, gravity, lifetime)
fn extract_physics_from_provider(source: &str) -> ExtractedParticlePhysics {
    let mut physics = ExtractedParticlePhysics::default();

    // Detect static random texture: providers that pass sprites.get(RandomSource) instead of sprites
    // Pattern: new ClassName(..., this.sprites.get($something), ...)
    // vs: new ClassName(..., this.sprites)
    let uses_sprite_get = Regex::new(r"this\.\w+\.get\s*\(\s*\$\$\d+\s*\)")
        .ok()
        .map(|re| re.is_match(source))
        .unwrap_or(false);
    physics.uses_static_texture = Some(uses_sprite_get);

    // Look for "new <ClassName>(" followed by constructor arguments
    // The pattern for RisingParticle subclasses typically passes gravity and lifetime as last args
    // Example: new hci($$0, $$1, $$2, $$3, $$4, $$5, $$6, this.b, 0.96f, 8 + $$0.v().a(4))
    //                                                        sprites, gravity, lifetime

    // Pattern for finding constructor calls with numeric literals at the end
    // Match: new ClassName(args..., floatLiteral, intLiteral + random)
    // Supports scientific notation like 3.0E-6
    let constructor_re = Regex::new(
        r"new\s+\w+\s*\([^)]*,\s*(-?[\d.]+(?:[eE][+-]?\d+)?)[fF]?\s*,\s*(\d+)(?:\s*\+\s*[\w.]+\((\d+)\))?\s*\)"
    ).ok();

    if let Some(re) = constructor_re {
        if let Some(caps) = re.captures(source) {
            // The second-to-last numeric is often gravity
            if let Some(gravity_match) = caps.get(1) {
                physics.gravity = gravity_match.as_str().parse().ok();
            }
            // The last numeric(s) are often lifetime
            if let Some(base_match) = caps.get(2) {
                let base: i32 = base_match.as_str().parse().unwrap_or(20);
                let range: i32 = caps.get(3)
                    .map(|m| m.as_str().parse().unwrap_or(0))
                    .unwrap_or(0);
                physics.lifetime = Some([base, base + range]);
            }
        }
    }

    // Also look for simpler patterns where values are set after construction
    // Pattern: particle.setGravity(X) or similar (supports scientific notation like 3.0E-6)
    let gravity_setter_re = Regex::new(r"\.\w*[Gg]ravity\s*[=(]\s*(-?[\d.]+(?:[eE][+-]?\d+)?)[fF]?").ok();
    if physics.gravity.is_none() {
        if let Some(re) = gravity_setter_re {
            if let Some(caps) = re.captures(source) {
                physics.gravity = caps.get(1).and_then(|m| m.as_str().parse().ok());
            }
        }
    }

    // Look for lifetime setter
    let lifetime_setter_re = Regex::new(r"\.\w*[Ll]ifetime\s*=\s*(\d+)").ok();
    if physics.lifetime.is_none() {
        if let Some(re) = lifetime_setter_re {
            if let Some(caps) = re.captures(source) {
                if let Some(val) = caps.get(1).and_then(|m| m.as_str().parse().ok()) {
                    physics.lifetime = Some([val, val]);
                }
            }
        }
    }

    // Look for scale setter (method call like .scale(0.5f) or obfuscated .d(0.5f))
    let scale_setter_re = Regex::new(r"\.\s*(?:scale|d)\s*\(\s*([\d.]+)[fF]?\s*\)").ok();
    if let Some(re) = scale_setter_re {
        if let Some(caps) = re.captures(source) {
            physics.scale = caps.get(1).and_then(|m| m.as_str().parse().ok());
        }
    }

    // Some provider constructors include a scale parameter directly (e.g., SmokeParticle(..., 1.0f, sprites)).
    // Heuristic: if we see `new <Class>(..., <floatLiteral>, this.<sprites>)`, treat that float as a scale.
    if physics.scale.is_none() {
        let scale_arg_re = Regex::new(r"new\s+\w+\s*\([^)]*,\s*([\d.]+)[fF]?\s*,\s*this\.\w+\s*\)").ok();
        if let Some(re) = scale_arg_re {
            if let Some(caps) = re.captures(source) {
                physics.scale = caps.get(1).and_then(|m| m.as_str().parse().ok());
            }
        }
    }

    physics
}

/// Detect if a particle skips friction by overriding tick() without calling super.tick()
///
/// In Minecraft, particles that override tick() without calling super.tick() don't apply friction.
/// This function checks if the particle class has a tick() method that doesn't call super.tick()
fn detect_skips_friction(source: &str) -> Option<bool> {
    // Check if there's a tick() method override
    let has_tick_override = Regex::new(r"@Override\s+public\s+void\s+tick\s*\(\s*\)")
        .ok()?
        .is_match(source);

    if !has_tick_override {
        return Some(false); // No override = uses default tick with friction
    }

    // Check if super.tick() is called anywhere in the file
    let calls_super_tick = source.contains("super.tick()");

    // If it overrides tick() but doesn't call super.tick(), it skips friction
    let result = !calls_super_tick;

    // Debug output for campfire particles
    if source.contains("CampfireSmokeParticle") {
        println!("[detect_skips_friction] CampfireSmokeParticle: has_tick_override={}, calls_super_tick={}, result={}",
            has_tick_override, calls_super_tick, result);
    }

    Some(result)
}

/// Extract particle physics from decompiled source
///
/// This is a regex-based parser that looks for common patterns in particle constructors
/// Uses obfuscated field names from Mojang mappings
fn extract_physics_from_source(source: &str, field_mappings: &ParticleFieldMappings) -> ExtractedParticlePhysics {
    let mut physics = ExtractedParticlePhysics::default();

    // Pattern: this.<field> = X or this.<field> = X + random.nextInt(Y)
    // Use obfuscated field name from mappings
    // Handles patterns like: this.lifetime = 8 + this.random.nextInt(4)
    //                   or: this.t = 8 + this.o.a(4)
    if let Some(lifetime_field) = &field_mappings.lifetime {
        // First try ternary conditional pattern: this.lifetime = condition ? (random.nextInt(X) + Y) : (random.nextInt(A) + B)
        // Example: this.lifetime = $$7 ? this.random.nextInt(50) + 280 : this.random.nextInt(50) + 80
        let ternary_pattern = format!(
            r"this\.{}\s*=\s*\$\$\d+\s*\?\s*[\w.]+\((\d+)\)\s*\+\s*(\d+)\s*:\s*[\w.]+\((\d+)\)\s*\+\s*(\d+)",
            regex::escape(lifetime_field)
        );
        if let Ok(ternary_re) = Regex::new(&ternary_pattern) {
            if let Some(caps) = ternary_re.captures(source) {
                // Extract both branches: if_true (range1 + base1) and if_false (range2 + base2)
                let range1: i32 = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
                let base1: i32 = caps.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
                let range2: i32 = caps.get(3).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
                let base2: i32 = caps.get(4).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);

                // Use the longer lifetime range as the default (typically the "true" branch for signal smoke)
                let lifetime1 = [base1, base1 + range1];
                let lifetime2 = [base2, base2 + range2];
                physics.lifetime = Some(if lifetime1[1] > lifetime2[1] { lifetime1 } else { lifetime2 });
            }
        }

        // Try division-based lifetime pattern: (int)(X / (Math.random() * Y + Z))
        // Example: this.lifetime = (int)(16.0 / (Math.random() * 0.8 + 0.2))
        // This gives range [X/Y+Z, X/Z] = [16.0/1.0, 16.0/0.2] = [16, 80]
        if physics.lifetime.is_none() {
            let division_pattern = format!(
                r"this\.{}\s*=\s*\(int\)\s*\(\s*([\d.]+)\s*/\s*\([\w.]+\s*\*\s*([\d.]+)\s*\+\s*([\d.]+)\s*\)\s*\)",
                regex::escape(lifetime_field)
            );
            if let Ok(div_re) = Regex::new(&division_pattern) {
                if let Some(caps) = div_re.captures(source) {
                    let numerator: f32 = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(16.0);
                    let rand_mult: f32 = caps.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(0.8);
                    let rand_add: f32 = caps.get(3).and_then(|m| m.as_str().parse().ok()).unwrap_or(0.2);
                    // Lifetime range: [numerator / (rand_mult + rand_add), numerator / rand_add]
                    let min = (numerator / (rand_mult + rand_add)) as i32;
                    let max = (numerator / rand_add) as i32;
                    physics.lifetime = Some([min, max]);
                }
            }
        }

        // If ternary pattern didn't match, try simple pattern
        if physics.lifetime.is_none() {
            let pattern = format!(
                r"this\.{}\s*=\s*(\d+)(?:\s*\+\s*[\w.]+\((\d+)\))?",
                regex::escape(lifetime_field)
            );
            if let Ok(lifetime_re) = Regex::new(&pattern) {
                if let Some(caps) = lifetime_re.captures(source) {
                    let base: i32 = caps.get(1).unwrap().as_str().parse().unwrap_or(20);
                    let range: i32 = caps
                        .get(2)
                        .map(|m| m.as_str().parse().unwrap_or(0))
                        .unwrap_or(0);
                    physics.lifetime = Some([base, base + range]);
                }
            }
        }
    }

    // Pattern: this.<gravity> = X (including scientific notation like 3.0E-6f)
    if let Some(gravity_field) = &field_mappings.gravity {
        let pattern = format!(
            r"this\.{}\s*=\s*(-?[\d.]+(?:[eE][+-]?\d+)?)[fF]?",
            regex::escape(gravity_field)
        );
        if let Ok(gravity_re) = Regex::new(&pattern) {
            if let Some(caps) = gravity_re.captures(source) {
                physics.gravity = caps.get(1).unwrap().as_str().parse().ok();
            }
        }
    }

    // Pattern: this.<quadSize> = X or this.setSize(X)
    if let Some(size_field) = &field_mappings.quad_size {
        let pattern = format!(
            r"this\.{}\s*=\s*([\d.]+)[fF]?",
            regex::escape(size_field)
        );
        if let Ok(size_re) = Regex::new(&pattern) {
            if let Some(caps) = size_re.captures(source) {
                physics.size = caps.get(1).unwrap().as_str().parse().ok();
            }
        }
    }
    // Also try setSize method which may still be named
    let setsize_re = Regex::new(r"this\.setSize\s*\(\s*([\d.]+)[fF]?\s*\)").unwrap();
    if physics.size.is_none() {
        if let Some(caps) = setsize_re.captures(source) {
            physics.size = caps.get(1).unwrap().as_str().parse().ok();
        }
    }

    // Pattern: this.<hasPhysics> = true/false
    if let Some(has_physics_field) = &field_mappings.has_physics {
        let pattern = format!(
            r"this\.{}\s*=\s*(true|false)",
            regex::escape(has_physics_field)
        );
        if let Ok(physics_re) = Regex::new(&pattern) {
            if let Some(caps) = physics_re.captures(source) {
                physics.has_physics = Some(caps.get(1).unwrap().as_str() == "true");
            }
        }
    }

    // Pattern: this.<alpha> = X
    if let Some(alpha_field) = &field_mappings.alpha {
        let pattern = format!(
            r"this\.{}\s*=\s*([\d.]+)[fF]?",
            regex::escape(alpha_field)
        );
        if let Ok(alpha_re) = Regex::new(&pattern) {
            if let Some(caps) = alpha_re.captures(source) {
                physics.alpha = caps.get(1).unwrap().as_str().parse().ok();
            }
        }
    }

    // Pattern: this.<friction> = X (including scientific notation)
    if let Some(friction_field) = &field_mappings.friction {
        let pattern = format!(
            r"this\.{}\s*=\s*([\d.]+(?:[eE][+-]?\d+)?)[fF]?",
            regex::escape(friction_field)
        );
        if let Ok(friction_re) = Regex::new(&pattern) {
            if let Some(caps) = friction_re.captures(source) {
                physics.friction = caps.get(1).unwrap().as_str().parse().ok();
            }
        }
    }

    // Pattern: Velocity multipliers - this.xd *= (double)X; (and yd, zd)
    // Example: this.xd *= (double)0.8f; this.yd *= (double)0.8f; this.zd *= (double)0.8f;
    if let Some(xd_field) = &field_mappings.xd {
        if let Some(yd_field) = &field_mappings.yd {
            if let Some(zd_field) = &field_mappings.zd {
                // Try to find velocity multiplication: this.xd *= (double)VALUE
                let xd_mult_pattern = format!(
                    r"this\.{}\s*\*=\s*\(double\)\s*([\d.]+)[fF]?",
                    regex::escape(xd_field)
                );
                let yd_mult_pattern = format!(
                    r"this\.{}\s*\*=\s*\(double\)\s*([\d.]+)[fF]?",
                    regex::escape(yd_field)
                );
                let zd_mult_pattern = format!(
                    r"this\.{}\s*\*=\s*\(double\)\s*([\d.]+)[fF]?",
                    regex::escape(zd_field)
                );

                let xd_mult = Regex::new(&xd_mult_pattern)
                    .ok()
                    .and_then(|re| re.captures(source))
                    .and_then(|caps| caps.get(1))
                    .and_then(|m| m.as_str().parse::<f32>().ok());
                let yd_mult = Regex::new(&yd_mult_pattern)
                    .ok()
                    .and_then(|re| re.captures(source))
                    .and_then(|caps| caps.get(1))
                    .and_then(|m| m.as_str().parse::<f32>().ok());
                let zd_mult = Regex::new(&zd_mult_pattern)
                    .ok()
                    .and_then(|re| re.captures(source))
                    .and_then(|caps| caps.get(1))
                    .and_then(|m| m.as_str().parse::<f32>().ok());

                if let (Some(x), Some(y), Some(z)) = (xd_mult, yd_mult, zd_mult) {
                    physics.velocity_multiplier = Some([x, y, z]);
                }
            }
        }
    }

    // Color: extract base RGB from SingleQuadParticle fields when set in the constructor
    // Pattern: this.<rCol> = 0.3f; (same for g/b)
    if field_mappings.r_col.is_some() && field_mappings.g_col.is_some() && field_mappings.b_col.is_some() {
        let parse_color_component = |field: &str| -> Option<f32> {
            // support floats with optional exponent and optional f suffix
            let pattern = format!(
                r"this\.{}\s*=\s*(-?[\d.]+(?:[eE][+-]?\d+)?)[fF]?",
                regex::escape(field)
            );
            let re = Regex::new(&pattern).ok()?;
            let caps = re.captures(source)?;
            caps.get(1)?.as_str().parse().ok()
        };

        if let (Some(rf), Some(gf), Some(bf)) = (
            parse_color_component(field_mappings.r_col.as_ref().unwrap()),
            parse_color_component(field_mappings.g_col.as_ref().unwrap()),
            parse_color_component(field_mappings.b_col.as_ref().unwrap()),
        ) {
            // Clamp into [0,1] range if it looks valid
            if (0.0..=1.0).contains(&rf) && (0.0..=1.0).contains(&gf) && (0.0..=1.0).contains(&bf) {
                physics.color = Some([rf, gf, bf]);
            }
        }
    }

    // Velocity: extract constructor modifications applied to (xd, yd, zd)
    // Minecraft stores velocity in blocks/tick; we keep values in that unit and convert in the frontend.
    let mut vel_mul = [1.0f32, 1.0f32, 1.0f32];
    let mut vel_add = [0.0f32, 0.0f32, 0.0f32];
    let mut vel_jitter = [0.0f32, 0.0f32, 0.0f32];
    let mut has_mul = false;
    let mut has_add = false;
    let mut has_jitter = false;

    // Use obfuscated velocity field names from mappings (CFR output uses obfuscated names)
    let axes: [(&Option<String>, usize); 3] = [(&field_mappings.xd, 0), (&field_mappings.yd, 1), (&field_mappings.zd, 2)];

    for (field_opt, axis) in axes {
        let Some(field) = field_opt.as_ref() else { continue };

        // Multipliers: this.<v> *= K  OR  this.<v> = this.<v> * K  OR  this.<v> = K * this.<v>
        // Account for type casts: this.xd *= (double)0.8f
        let mul_patterns = [
            format!(r"this\.{}\s*\*=\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field)),
            format!(r"this\.{}\s*=\s*this\.{}\s*\*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field), regex::escape(field)),
            format!(r"this\.{}\s*=\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?\s*\*\s*this\.{}", regex::escape(field), regex::escape(field)),
        ];
        for pat in mul_patterns {
            if let Ok(re) = Regex::new(&pat) {
                if let Some(caps) = re.captures(source) {
                    if let Ok(k) = caps.get(1).unwrap().as_str().parse::<f32>() {
                        vel_mul[axis] *= k;
                        has_mul = true;
                        break;
                    }
                }
            }
        }

        // Constant add: this.<v> += K  OR  this.<v> = this.<v> + K  OR  this.<v> = K + this.<v>
        // Account for type casts: this.yd += (double)0.05f
        let add_patterns = [
            format!(r"this\.{}\s*\+=\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field)),
            format!(r"this\.{}\s*=\s*this\.{}\s*\+\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field), regex::escape(field)),
            format!(r"this\.{}\s*=\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?\s*\+\s*this\.{}", regex::escape(field), regex::escape(field)),
        ];
        for pat in add_patterns {
            if let Ok(re) = Regex::new(&pat) {
                if let Some(caps) = re.captures(source) {
                    if let Ok(k) = caps.get(1).unwrap().as_str().parse::<f32>() {
                        vel_add[axis] += k;
                        has_add = true;
                        break;
                    }
                }
            }
        }

        // Random add (common patterns with Math.random):
        // - this.<v> += (Math.random() - 0.5) * K   => jitter += K
        // - this.<v> += (Math.random() * 2.0 - 1.0) * K => jitter += 2K
        // Account for type casts: (double), (float), (int)
        let jitter_patterns = [
            (format!(r"this\.{}\s*\+=\s*\(*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)*\(*\s*Math\.random\(\)\s*-\s*0\.5\s*\)*\s*\*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field)), 1.0f32),
            (format!(r"this\.{}\s*\+=\s*\(*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)*\(*\s*Math\.random\(\)\s*\*\s*2\.0[dD]?\s*-\s*1\.0[dD]?\s*\)*\s*\*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?", regex::escape(field)), 2.0f32),
        ];
        for (pat, scale) in jitter_patterns {
            if let Ok(re) = Regex::new(&pat) {
                if let Some(caps) = re.captures(source) {
                    if let Ok(k) = caps.get(1).unwrap().as_str().parse::<f32>() {
                        vel_jitter[axis] += k * scale;
                        has_jitter = true;
                        break;
                    }
                }
            }
        }

        // Direct assignment with random (completely replaces incoming velocity):
        // Pattern: this.yd = this.random.nextFloat() * 0.4f + 0.05f
        // Pattern: this.r = this.o.nextFloat() * 0.4f + 0.05f (obfuscated random field)
        // Pattern: this.yd = $$3.nextFloat() * K + C (CFR style)
        // Account for type casts: this.yd = (float)this.random.nextFloat() * 0.4f + 0.05f
        // This means: ignore incoming velocity, set to random(C, C+K)
        // We represent as: multiplier=0, add=midpoint, jitter=range
        let direct_random_pat = format!(
            r"this\.{}\s*=\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?(?:this\.\w+\.|\$+\d+\.)\w+\(\)\s*\*\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?\s*\+\s*(?:\(\s*(?:double|float|int)\s*\)\s*)?([-+]?[\d.]+(?:[eE][+-]?\d+)?)[dDfF]?",
            regex::escape(field)
        );
        if let Ok(re) = Regex::new(&direct_random_pat) {
            if let Some(caps) = re.captures(source) {
                // Extract multiplier (K) and base (C) from: random() * K + C
                if let (Ok(k), Ok(c)) = (
                    caps.get(1).unwrap().as_str().parse::<f32>(),
                    caps.get(2).unwrap().as_str().parse::<f32>(),
                ) {
                    // Range is [C, C+K], so midpoint is C + K/2, jitter is K
                    vel_mul[axis] = 0.0; // Ignore incoming velocity
                    vel_add[axis] = c + k / 2.0; // Midpoint
                    vel_jitter[axis] = k; // Full range (jitter is ±K/2)
                    has_mul = true;
                    has_add = true;
                    has_jitter = true;
                }
            }
        }
    }

    if has_mul {
        physics.velocity_multiplier = Some(vel_mul);
    }
    if has_add {
        physics.velocity_add = Some(vel_add);
    }
    if has_jitter {
        physics.velocity_jitter = Some(vel_jitter);
    }

    // Parse tick() method for particle spawning
    physics.spawns_particles = parse_tick_spawned_particles(source);

    physics
}

fn extract_if_condition(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if !trimmed.starts_with("if") {
        return None;
    }

    let start = trimmed.find('(')?;
    let chars: Vec<char> = trimmed.chars().collect();
    let mut depth = 0;
    let mut end = start;

    for i in start..chars.len() {
        if chars[i] == '(' {
            depth += 1;
        } else if chars[i] == ')' {
            depth -= 1;
            if depth == 0 {
                end = i;
                break;
            }
        }
    }

    if depth != 0 {
        return None;
    }

    let condition: String = chars[(start + 1)..end].iter().collect();
    Some(condition.trim().to_string())
}

fn extract_tick_method_body(source: &str) -> Option<String> {
    let tick_method_re = Regex::new(r"(?:public\s+)?void\s+tick\s*\(\s*\)\s*\{").ok()?;
    let mat = tick_method_re.find(source)?;
    let start = mat.end();
    let bytes = source.as_bytes();
    let mut depth = 1usize;
    let mut i = start;

    while i < bytes.len() {
        match bytes[i] as char {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(source[start..i].to_string());
                }
            }
            _ => {}
        }
        i += 1;
    }

    None
}

/// Parse tick() method to extract particles spawned during the particle's lifetime
fn parse_tick_spawned_particles(source: &str) -> Option<Vec<SpawnedParticle>> {
    let mut spawned = Vec::new();

    let method_body = match extract_tick_method_body(source) {
        Some(body) => body,
        None => return None,
    };

    let add_particle_re = Regex::new(
        r"(?:this\.)?level\.addParticle\s*\(\s*ParticleTypes\s*\.\s*(\w+)",
    )
    .unwrap();
    let loop_count_re = Regex::new(r"for\s*\([^<]*<\s*([^;]+);").unwrap();
    let local_assign_re =
        Regex::new(r"(?:final\s+)?(?:double|float|int|long)\s+(\$\$\d+)\s*=\s*([^;]+);")
            .unwrap();
    let local_ref_re = Regex::new(r"\$\$\d+").unwrap();

    let mut probability_guard: Option<String> = None;
    let mut loop_count: Option<String> = None;
    let mut locals: HashMap<String, String> = HashMap::new();

    let inline_locals = |expr: &str, locals: &HashMap<String, String>| -> String {
        local_ref_re
            .replace_all(expr, |caps: &regex::Captures| {
                let token = caps.get(0).unwrap().as_str();
                locals
                    .get(token)
                    .cloned()
                    .unwrap_or_else(|| token.to_string())
            })
            .to_string()
    };

    for line in method_body.lines() {
        let trimmed = line.trim();
        if trimmed == "}" {
            probability_guard = None;
            loop_count = None;
            locals.clear();
        }

        if let Some(caps) = local_assign_re.captures(trimmed) {
            let var = caps.get(1).unwrap().as_str().to_string();
            let expr = caps.get(2).unwrap().as_str().trim().to_string();
            locals.insert(var, expr);
            continue;
        }

        if let Some(prob_expr) = extract_if_condition(line) {
            if prob_expr.contains("random") || prob_expr.contains("next") {
                probability_guard = Some(inline_locals(&prob_expr, &locals));
            }
        }

        if let Some(caps) = loop_count_re.captures(line) {
            let count_expr = caps.get(1).unwrap().as_str().trim().to_string();
            if count_expr.contains("next") {
                loop_count = Some(inline_locals(&count_expr, &locals));
            }
        }

        for caps in add_particle_re.captures_iter(line) {
            let particle_type = caps.get(1).unwrap().as_str().to_lowercase();

            spawned.push(SpawnedParticle {
                particle_id: particle_type,
                probability_expr: probability_guard.clone(),
                count_expr: loop_count.clone(),
            });
        }

        if line.trim_start().starts_with("if") && !line.contains('{') {
            probability_guard = None;
        }
    }

    if spawned.is_empty() {
        None
    } else {
        Some(spawned)
    }
}

/// Check if CFR decompiler is available
fn find_cfr_jar() -> Option<PathBuf> {
    // Check common locations
    let locations = vec![
        // In the app's resources
        PathBuf::from("resources/cfr.jar"),
        // In cache directory
        dirs::cache_dir()
            .map(|d| d.join("weaverbird").join("tools").join("cfr.jar"))
            .unwrap_or_default(),
    ];

    for loc in locations {
        if loc.exists() {
            return Some(loc);
        }
    }

    None
}

/// Download CFR decompiler if not present
pub async fn ensure_cfr_available() -> Result<PathBuf> {
    if let Some(path) = find_cfr_jar() {
        return Ok(path);
    }

    let tools_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Could not find cache directory"))?
        .join("weaverbird")
        .join("tools");

    fs::create_dir_all(&tools_dir).context("Failed to create tools directory")?;

    let cfr_path = tools_dir.join("cfr.jar");

    println!("[particle_physics] Downloading CFR decompiler...");

    // Download CFR from GitHub releases
    let cfr_url = "https://github.com/leibnitz27/cfr/releases/download/0.152/cfr-0.152.jar";
    let response = reqwest::get(cfr_url)
        .await
        .context("Failed to download CFR")?;
    let bytes = response.bytes().await.context("Failed to read CFR bytes")?;

    fs::write(&cfr_path, &bytes).context("Failed to save CFR")?;

    println!(
        "[particle_physics] Downloaded CFR decompiler ({} bytes)",
        bytes.len()
    );

    Ok(cfr_path)
}

/// Decompile a specific class from the JAR
/// Decompile the entire JAR file at once (much faster than per-class)
fn decompile_entire_jar(
    cfr_path: &Path,
    jar_path: &Path,
    output_dir: &Path,
) -> Result<()> {
    println!("[particle_physics] Decompiling entire JAR (this may take 30-60 seconds)...");

    let output = Command::new("java")
        .args([
            "-jar",
            cfr_path.to_str().unwrap(),
            jar_path.to_str().unwrap(),
            "--outputdir",
            output_dir.to_str().unwrap(),
            "--silent",
            "true",
        ])
        .output()
        .context("Failed to run CFR decompiler")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("CFR decompilation failed: {}", stderr));
    }

    println!("[particle_physics] ✓ JAR decompilation complete");
    Ok(())
}

/// Read a decompiled class file from disk
fn read_decompiled_class(
    output_dir: &Path,
    class_name: &str,
) -> Result<String> {
    // Handle inner classes - they're in the outer class file
    let (outer_class, _is_inner) = if class_name.contains('$') {
        let parts: Vec<&str> = class_name.split('$').collect();
        (parts[0].to_string(), true)
    } else {
        (class_name.to_string(), false)
    };

    // Convert class name to path format
    let class_path = outer_class.replace('.', "/") + ".java";
    let output_file = output_dir.join(&class_path);

    if !output_file.exists() {
        return Err(anyhow!("Decompiled file not found: {:?}", output_file));
    }

    fs::read_to_string(&output_file).context("Failed to read decompiled file")
}

fn _decompile_class(
    cfr_path: &Path,
    jar_path: &Path,
    class_name: &str,
    output_dir: &Path,
) -> Result<String> {
    // Handle inner classes - CFR puts them in the outer class file
    // e.g., "hdp$a" (SmokeParticle$Provider) is inside hdp.java
    let (outer_class, is_inner) = if class_name.contains('$') {
        let parts: Vec<&str> = class_name.split('$').collect();
        (parts[0].to_string(), true)
    } else {
        (class_name.to_string(), false)
    };

    // Convert class name to path format
    let class_path = outer_class.replace('.', "/") + ".class";

    // Run CFR on the outer class
    let output = Command::new("java")
        .args([
            "-jar",
            cfr_path.to_str().unwrap(),
            jar_path.to_str().unwrap(),
            "--outputdir",
            output_dir.to_str().unwrap(),
            &outer_class,
        ])
        .output()
        .context("Failed to run CFR decompiler")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("CFR decompilation failed: {}", stderr));
    }

    // Read the decompiled file
    let output_file = output_dir.join(class_path.replace(".class", ".java"));
    if output_file.exists() {
        let content = fs::read_to_string(&output_file).context("Failed to read decompiled file")?;

        // For inner classes, try to extract just the inner class definition
        if is_inner {
            // The inner class name after $ (e.g., "a" from "hdp$a")
            let inner_name = class_name.split('$').last().unwrap_or("");
            println!(
                "[particle_physics] Looking for inner class {} in outer class {}",
                inner_name, outer_class
            );

            let inner_re = Regex::new(&format!(r"(?m)\bclass\s+{}\b", regex::escape(inner_name)))
                .context("Failed to build inner class regex")?;
            if let Some(m) = inner_re.find(&content) {
                // Find opening brace for the class body
                let brace_rel = content[m.end()..].find('{');
                if let Some(brace_rel) = brace_rel {
                    let brace_start = m.end() + brace_rel;
                    let mut depth: i32 = 0;
                    let bytes = content.as_bytes();
                    let mut i = brace_start;
                    while i < bytes.len() {
                        match bytes[i] as char {
                            '{' => depth += 1,
                            '}' => {
                                depth -= 1;
                                if depth == 0 {
                                    let end = i + 1;
                                    return Ok(content[m.start()..end].to_string());
                                }
                            }
                            _ => {}
                        }
                        i += 1;
                    }
                }
            }
        }

        Ok(content)
    } else {
        Err(anyhow!("Decompiled file not found: {:?}", output_file))
    }
}

/// Extract particle physics for a Minecraft version
/// This is an expensive operation - use caching!
pub async fn extract_particle_physics(
    jar_path: &Path,
    version: &str,
) -> Result<ExtractedPhysicsData> {
    // Check cache first
    if let Some(cached) = load_cached_physics_data(version)? {
        println!(
            "[particle_physics] Using cached physics data for {}",
            version
        );
        return Ok(cached);
    }

    println!(
        "[particle_physics] Extracting particle physics for {}...",
        version
    );

    // Download mappings for validation only (not used for class lookups since we use deobfuscated names)
    let mappings_path = download_mojang_mappings(version).await?;
    let (_class_mappings, _obfuscated_field_mappings) = parse_mappings(&mappings_path)?;

    // Use deobfuscated field names since blocks_decompile has deobfuscated code
    let field_mappings = ParticleFieldMappings {
        lifetime: Some("lifetime".to_string()),
        gravity: Some("gravity".to_string()),
        has_physics: Some("hasPhysics".to_string()),
        friction: Some("friction".to_string()),
        xd: Some("xd".to_string()),
        yd: Some("yd".to_string()),
        zd: Some("zd".to_string()),
        quad_size: Some("quadSize".to_string()),
        r_col: Some("rCol".to_string()),
        g_col: Some("gCol".to_string()),
        b_col: Some("bCol".to_string()),
        alpha: Some("alpha".to_string()),
    };

    // Use the existing blocks_decompile directory (shared with block_emissions extraction)
    // This contains deobfuscated code which is much easier to parse
    let temp_dir = get_physics_cache_dir()?.join("blocks_decompile");

    // Only decompile if directory doesn't exist or is empty
    if !temp_dir.exists() || temp_dir.read_dir().ok().map_or(true, |mut d| d.next().is_none()) {
        // Ensure CFR is available
        let cfr_path = ensure_cfr_available().await?;
        fs::create_dir_all(&temp_dir).context("Failed to create decompile directory")?;

        // Decompile the entire JAR once (much faster than per-class)
        decompile_entire_jar(&cfr_path, jar_path, &temp_dir)?;
    } else {
        println!("[particle_physics] Using cached decompiled source at {:?}", temp_dir);
    }

    let particle_classes = get_particle_class_mappings();
    let provider_map = get_provider_to_particle_map();

    println!("[particle_physics] Processing {} particle classes in parallel...", particle_classes.len());
    let start_time = std::time::Instant::now();

    // Process all particles in parallel using rayon
    use rayon::prelude::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    let processed = AtomicUsize::new(0);
    let total = particle_classes.len();

    let extracted_particles: HashMap<String, ExtractedParticlePhysics> = particle_classes
        .par_iter()
        .filter_map(|(class_name, particle_type)| {
            let count = processed.fetch_add(1, Ordering::Relaxed) + 1;
            if count % 10 == 0 || count == total {
                println!("[particle_physics] Progress: {}/{} particles processed", count, total);
            }
            // Use deobfuscated class name since blocks_decompile has deobfuscated files
            // (CFR was run with --obfuscationmappings flag during decompilation)
            let source = read_decompiled_class(&temp_dir, class_name).ok()?;

            // Use different extraction strategies
            let physics = if particle_type.starts_with("__provider_") {
                let provider_physics = extract_physics_from_provider(&source);
                if particle_type.contains("campfire") {
                    println!("[extraction] {} (provider): {:?}", particle_type, provider_physics);
                }
                provider_physics
            } else {
                // First try direct field assignments
                let direct = extract_physics_from_source(&source, &field_mappings);
                // Then try super() call extraction
                let from_super = extract_physics_from_super_call(&source, &field_mappings);

                // Detect skips_friction (particle overrides tick() without calling super.tick())
                let skips_friction = detect_skips_friction(&source);

                // Merge both, preferring direct assignments
                let class_physics = ExtractedParticlePhysics {
                    lifetime: direct.lifetime.or(from_super.lifetime),
                    gravity: direct.gravity.or(from_super.gravity),
                    size: direct.size.or(from_super.size),
                    scale: direct.scale.or(from_super.scale),
                    has_physics: direct.has_physics.or(from_super.has_physics),
                    alpha: direct.alpha.or(from_super.alpha),
                    friction: direct.friction.or(from_super.friction),
                    velocity_multiplier: direct.velocity_multiplier.or(from_super.velocity_multiplier),
                    velocity_add: direct.velocity_add.or(from_super.velocity_add),
                    velocity_jitter: direct.velocity_jitter.or(from_super.velocity_jitter),
                    color: direct.color.or(from_super.color),
                    color_scale: direct.color_scale.or(from_super.color_scale),
                    lifetime_base: direct.lifetime_base.or(from_super.lifetime_base),
                    lifetime_animation: direct.lifetime_animation.or(from_super.lifetime_animation),
                    behavior: direct.behavior.or(from_super.behavior),
                    tick_velocity_delta: direct.tick_velocity_delta.or(from_super.tick_velocity_delta),
                    spawns_particles: direct.spawns_particles.or(from_super.spawns_particles),
                    skips_friction,
                    uses_static_texture: None, // Will be set from provider analysis
                };
                if particle_type.contains("campfire") {
                    println!("[extraction] {} (class): {:?}", particle_type, class_physics);
                }
                class_physics
            };

            // Only include if we found any physics values
            if physics.lifetime.is_some()
                || physics.gravity.is_some()
                || physics.size.is_some()
                || physics.has_physics.is_some()
                || physics.friction.is_some()
                || physics.skips_friction.is_some()
                || physics.uses_static_texture.is_some()
            {
                // For provider classes, map to the actual particle type
                let target_type = if particle_type.starts_with("__provider_") {
                    provider_map.get(particle_type).unwrap_or(particle_type).to_string()
                } else {
                    particle_type.to_string()
                };

                Some((target_type, physics))
            } else {
                None
            }
        })
        .fold(
            || HashMap::new(),
            |mut map: HashMap<String, ExtractedParticlePhysics>, (particle_type, physics)| {
                // Merge with existing physics for this particle type instead of overwriting
                map.entry(particle_type)
                    .and_modify(|existing| {
                        // Merge: prefer new values if present, otherwise keep existing
                        *existing = ExtractedParticlePhysics {
                            lifetime: physics.lifetime.or(existing.lifetime),
                            gravity: physics.gravity.or(existing.gravity),
                            size: physics.size.or(existing.size),
                            scale: physics.scale.or(existing.scale),
                            has_physics: physics.has_physics.or(existing.has_physics),
                            alpha: physics.alpha.or(existing.alpha),
                            friction: physics.friction.or(existing.friction),
                            velocity_multiplier: physics.velocity_multiplier.or(existing.velocity_multiplier),
                            velocity_add: physics.velocity_add.or(existing.velocity_add),
                            velocity_jitter: physics.velocity_jitter.or(existing.velocity_jitter),
                            color: physics.color.or(existing.color),
                            color_scale: physics.color_scale.or(existing.color_scale),
                            lifetime_base: physics.lifetime_base.or(existing.lifetime_base),
                            lifetime_animation: physics.lifetime_animation.or(existing.lifetime_animation),
                            behavior: physics.behavior.clone().or(existing.behavior.clone()),
                            tick_velocity_delta: physics.tick_velocity_delta.or(existing.tick_velocity_delta),
                            spawns_particles: physics.spawns_particles.clone().or(existing.spawns_particles.clone()),
                            skips_friction: physics.skips_friction.or(existing.skips_friction),
                            uses_static_texture: physics.uses_static_texture.or(existing.uses_static_texture),
                        };
                    })
                    .or_insert(physics);
                map
            },
        )
        .reduce(|| HashMap::new(), |mut a, b| {
            for (k, v) in b {
                a.entry(k)
                    .and_modify(|existing| {
                        // Merge again during reduce
                        *existing = ExtractedParticlePhysics {
                            lifetime: v.lifetime.or(existing.lifetime),
                            gravity: v.gravity.or(existing.gravity),
                            size: v.size.or(existing.size),
                            scale: v.scale.or(existing.scale),
                            has_physics: v.has_physics.or(existing.has_physics),
                            alpha: v.alpha.or(existing.alpha),
                            friction: v.friction.or(existing.friction),
                            velocity_multiplier: v.velocity_multiplier.or(existing.velocity_multiplier),
                            velocity_add: v.velocity_add.or(existing.velocity_add),
                            velocity_jitter: v.velocity_jitter.or(existing.velocity_jitter),
                            color: v.color.or(existing.color),
                            color_scale: v.color_scale.or(existing.color_scale),
                            lifetime_base: v.lifetime_base.or(existing.lifetime_base),
                            lifetime_animation: v.lifetime_animation.or(existing.lifetime_animation),
                            behavior: v.behavior.clone().or(existing.behavior.clone()),
                            tick_velocity_delta: v.tick_velocity_delta.or(existing.tick_velocity_delta),
                            spawns_particles: v.spawns_particles.clone().or(existing.spawns_particles.clone()),
                            skips_friction: v.skips_friction.or(existing.skips_friction),
                            uses_static_texture: v.uses_static_texture.or(existing.uses_static_texture),
                        };
                    })
                    .or_insert(v);
            }
            a
        });

    let elapsed = start_time.elapsed();
    println!(
        "[particle_physics] ✓ Extracted physics for {} particles in {:.2}s",
        extracted_particles.len(),
        elapsed.as_secs_f32()
    );

    // Apply inheritance: fill in missing physics from parent classes
    let inheritance_map = get_particle_inheritance();
    let base_defaults = get_base_particle_defaults();
    let rising_defaults = get_rising_particle_defaults();
    let ash_smoke_defaults = get_ash_smoke_particle_defaults();
    let mut final_particles = extracted_particles.clone();

    for (particle_type, parent_type) in inheritance_map.iter() {
        // Skip base classes themselves
        if particle_type.starts_with("__base_") {
            continue;
        }

        // Get current physics for this particle (or empty)
        let current = final_particles.get(*particle_type).cloned().unwrap_or_default();

        // Get parent physics - use hardcoded defaults for base classes if not extracted
        let parent_physics = if *parent_type == "__base_particle" {
            base_defaults.clone()
        } else if *parent_type == "__base_rising" {
            rising_defaults.clone()
        } else if *parent_type == "__base_ash_smoke" {
            ash_smoke_defaults.clone()
        } else {
            extracted_particles.get(*parent_type).cloned().unwrap_or(base_defaults.clone())
        };

        // Merge: use current values where present, fall back to parent values
        let merged = ExtractedParticlePhysics {
            lifetime: current.lifetime.or(parent_physics.lifetime),
            gravity: current.gravity.or(parent_physics.gravity),
            size: current.size.or(parent_physics.size),
            scale: current.scale.or(parent_physics.scale),
            has_physics: current.has_physics.or(parent_physics.has_physics),
            alpha: current.alpha.or(parent_physics.alpha),
            friction: current.friction.or(parent_physics.friction),
            velocity_multiplier: current.velocity_multiplier.or(parent_physics.velocity_multiplier),
            velocity_add: current.velocity_add.or(parent_physics.velocity_add),
            velocity_jitter: current.velocity_jitter.or(parent_physics.velocity_jitter),
            color: current.color.or(parent_physics.color),
            color_scale: current.color_scale.or(parent_physics.color_scale),
            lifetime_base: current.lifetime_base.or(parent_physics.lifetime_base),
            lifetime_animation: current.lifetime_animation.or(parent_physics.lifetime_animation),
            behavior: current.behavior.or(parent_physics.behavior),
            tick_velocity_delta: current.tick_velocity_delta.or(parent_physics.tick_velocity_delta),
            spawns_particles: current.spawns_particles.or(parent_physics.spawns_particles),
            skips_friction: current.skips_friction.or(parent_physics.skips_friction),
            uses_static_texture: current.uses_static_texture.or(parent_physics.uses_static_texture),
        };

        // Only add if we have some useful values
        if merged.lifetime.is_some()
            || merged.gravity.is_some()
            || merged.size.is_some()
            || merged.scale.is_some()
            || merged.has_physics.is_some()
            || merged.alpha.is_some()
            || merged.friction.is_some()
            || merged.velocity_multiplier.is_some()
            || merged.velocity_add.is_some()
            || merged.velocity_jitter.is_some()
            || merged.color.is_some()
            || merged.color_scale.is_some()
            || merged.lifetime_base.is_some()
            || merged.lifetime_animation.is_some()
            || merged.behavior.is_some()
            || merged.tick_velocity_delta.is_some()
        {
            println!(
                "[particle_physics] {} inherits from {}: {:?}",
                particle_type, parent_type, merged
            );
            final_particles.insert(particle_type.to_string(), merged);
        }
    }

    // Post-process behavior-specific derived values.
    // BaseAshSmokeParticle lifetime is computed from `lifetime_base` and `scale`:
    // lifetime = (int)(baseLifetime / (rand * 0.8 + 0.2) * scale)
    // Range is [baseLifetime*scale, baseLifetime*scale*5] (clamped to >= 1).
    for physics in final_particles.values_mut() {
        if physics.lifetime.is_none() {
            if physics.behavior.as_deref() == Some("ash_smoke") {
                if let Some(base) = physics.lifetime_base {
                    let scale = physics.scale.unwrap_or(1.0);
                    let min = ((base as f32) * scale).floor() as i32;
                    let max = ((base as f32) * scale * 5.0).floor() as i32;
                    physics.lifetime = Some([min.max(1), max.max(1)]);
                }
            }
        }
    }

    // Remove base class entries (they're internal, not real particle types)
    final_particles.retain(|k, _| !k.starts_with("__base_") && !k.starts_with("__provider_"));

    let data = ExtractedPhysicsData {
        schema_version: 5,
        version: version.to_string(),
        particles: final_particles,
    };

    // Cache the results
    save_physics_data_to_cache(&data)?;

    // Keep decompiled directory cached for future extractions (shared with block_emissions)

    Ok(data)
}

/// Get particle physics, preferring extracted data over hardcoded defaults
pub async fn get_particle_physics_for_version(
    jar_path: &Path,
    version: &str,
) -> Result<ExtractedPhysicsData> {
    // Check cache first
    if let Some(cached) = load_cached_physics_data(version)? {
        return Ok(cached);
    }

    // Try to extract
    extract_particle_physics(jar_path, version).await
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create field mappings with readable names (for testing deobfuscated code)
    fn readable_field_mappings() -> ParticleFieldMappings {
        ParticleFieldMappings {
            lifetime: Some("lifetime".to_string()),
            gravity: Some("gravity".to_string()),
            has_physics: Some("hasPhysics".to_string()),
            friction: Some("friction".to_string()),
            quad_size: Some("quadSize".to_string()),
            alpha: Some("alpha".to_string()),
            r_col: Some("rCol".to_string()),
            g_col: Some("gCol".to_string()),
            b_col: Some("bCol".to_string()),
            xd: Some("xd".to_string()),
            yd: Some("yd".to_string()),
            zd: Some("zd".to_string()),
        }
    }

    /// Create field mappings with obfuscated names (for testing obfuscated code)
    fn obfuscated_field_mappings() -> ParticleFieldMappings {
        ParticleFieldMappings {
            lifetime: Some("t".to_string()),
            gravity: Some("u".to_string()),
            has_physics: Some("n".to_string()),
            friction: Some("B".to_string()),
            quad_size: Some("C".to_string()),
            alpha: Some("g".to_string()),
            r_col: Some("d".to_string()),
            g_col: Some("e".to_string()),
            b_col: Some("f".to_string()),
            xd: Some("o".to_string()),
            yd: Some("p".to_string()),
            zd: Some("q".to_string()),
        }
    }

    #[test]
    fn test_extract_physics_from_readable_source() {
        // Test with readable (deobfuscated) field names
        let source = r#"
            public FlameParticle(Level level, double x, double y, double z) {
                super(level, x, y, z);
                this.lifetime = 8 + this.random.nextInt(4);
                this.gravity = -0.06f;
                this.quadSize = 0.1f;
                this.hasPhysics = false;
            }
        "#;

        let physics = extract_physics_from_source(source, &readable_field_mappings());
        assert_eq!(physics.lifetime, Some([8, 12]));
        assert_eq!(physics.gravity, Some(-0.06));
        assert_eq!(physics.size, Some(0.1));
        assert_eq!(physics.has_physics, Some(false));
    }

    #[test]
    fn test_extract_physics_from_obfuscated_source() {
        // Test with obfuscated field names (as CFR actually outputs)
        let source = r#"
            public gca(gcm gcm2, double d, double d2, double d3) {
                super(gcm2, d, d2, d3);
                this.t = 8 + this.o.a(4);
                this.u = -0.06f;
                this.C = 0.1f;
                this.n = false;
            }
        "#;

        let physics = extract_physics_from_source(source, &obfuscated_field_mappings());
        assert_eq!(physics.lifetime, Some([8, 12]));
        assert_eq!(physics.gravity, Some(-0.06));
        assert_eq!(physics.size, Some(0.1));
        assert_eq!(physics.has_physics, Some(false));
    }

    #[test]
    fn test_particle_class_mappings() {
        let mappings = get_particle_class_mappings();
        assert!(mappings.contains_key("net.minecraft.client.particle.FlameParticle"));
        assert_eq!(
            mappings.get("net.minecraft.client.particle.FlameParticle"),
            Some(&"flame")
        );
    }

    #[test]
    fn test_parse_vanilla_version() {
        // Clean vanilla versions
        assert_eq!(parse_vanilla_version("1.21.4"), "1.21.4");
        assert_eq!(parse_vanilla_version("1.20.1"), "1.20.1");
        assert_eq!(parse_vanilla_version("1.21"), "1.21");
        assert_eq!(parse_vanilla_version("1.21.10"), "1.21.10");
        assert_eq!(parse_vanilla_version("1.21.11"), "1.21.11");

        // Fabric modded versions
        assert_eq!(parse_vanilla_version("1.21.4-fabric"), "1.21.4");
        assert_eq!(parse_vanilla_version("1.21.4-fabric-0.16.5"), "1.21.4");
        assert_eq!(parse_vanilla_version("1.21.10-0.18.1"), "1.21.10");

        // Forge modded versions
        assert_eq!(parse_vanilla_version("1.20.1-forge-47.2.0"), "1.20.1");
    }
}
