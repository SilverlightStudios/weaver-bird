/// Block Animation Extractor
///
/// Extracts vanilla block entity animations from Minecraft's decompiled source code.
/// Similar to particle physics extractor, but focuses on block animations like:
/// - Bell ringing
/// - Chest opening
/// - Shulker box opening/closing
/// - etc.
///
/// This data is extracted on-demand from the Minecraft JAR and cached.
use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Animation trigger types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AnimationTrigger {
    /// Plays continuously (e.g., mob idle animations)
    Always,
    /// Plays when player right-clicks/interacts (e.g., bell ringing)
    Interact,
    /// Plays when redstone powered
    Redstone,
    /// Plays when entity takes damage
    Damage,
    /// Plays when entity walks/moves
    Walk,
    /// Custom trigger (extracted from code)
    Custom(String),
}

/// Single animation keyframe (JPM-compatible)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyframe {
    /// Time in animation (0.0 to 1.0, normalized)
    pub time: f32,
    /// Value at this keyframe (degrees for rotation, blocks for position)
    pub value: f32,
    /// Interpolation type
    #[serde(default = "default_interpolation")]
    pub interpolation: String,
}

fn default_interpolation() -> String {
    "linear".to_string()
}

/// Animation data for a single model part
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PartAnimation {
    /// Rotation keyframes (degrees)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation_x: Option<Vec<Keyframe>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation_y: Option<Vec<Keyframe>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation_z: Option<Vec<Keyframe>>,

    /// Position offset keyframes (blocks)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position_x: Option<Vec<Keyframe>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position_y: Option<Vec<Keyframe>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position_z: Option<Vec<Keyframe>>,
}

/// Single animation definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Animation {
    /// Animation name (e.g., "ring", "open", "walk")
    pub name: String,
    /// When this animation triggers
    pub trigger: AnimationTrigger,
    /// Duration in game ticks (20 ticks = 1 second)
    pub duration_ticks: u32,
    /// Whether the animation loops
    pub looping: bool,
    /// Animations for each model part (e.g., "bell_body", "lid")
    pub parts: HashMap<String, PartAnimation>,
}

/// Extracted animation data for a single entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityAnimations {
    /// Entity ID (e.g., "bell", "chest", "zombie")
    pub entity_id: String,
    /// All animations for this entity
    pub animations: Vec<Animation>,
}

/// JPM-style animation layer (for mob procedural animations)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JPMAnimationLayer {
    /// Property expressions (e.g., "head.rx": "head_pitch * torad")
    #[serde(flatten)]
    pub expressions: HashMap<String, String>,
}

/// Mob model with JPM animation layers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobModel {
    /// Entity ID (e.g., "zombie", "creeper")
    pub entity_id: String,
    /// JPM animation layers extracted from model class
    pub animation_layers: Vec<JPMAnimationLayer>,
    /// Animation trigger (for block entities)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trigger: Option<AnimationTrigger>,
    /// Whether this is a block entity (vs mob)
    #[serde(default)]
    pub is_block_entity: bool,
    /// Parent-child hierarchy extracted from Minecraft's model code
    /// Maps bone name -> parent bone name (None/null for root bones)
    /// Used by JEM loader to establish correct transform inheritance
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub hierarchy: HashMap<String, Option<String>>,
    /// Animation duration in game ticks (extracted from BlockEntity class)
    /// For bell: 50 ticks, for chest: varies by openness, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ticks: Option<u32>,
}

/// All extracted animations for a Minecraft version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedAnimationData {
    /// Schema version for cache compatibility
    #[serde(default)]
    pub schema_version: u32,
    /// Minecraft version
    pub version: String,
    /// Block entity keyframe animations (bell, chest, shulker)
    pub entities: HashMap<String, EntityAnimations>,
    /// Mob model JPM animations (zombie, creeper, cow, pig)
    #[serde(default)]
    pub mob_models: HashMap<String, MobModel>,
}

/// Get cache directory for animation data
fn get_animation_cache_dir() -> Result<PathBuf> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Could not find cache directory"))?
        .join("weaverbird")
        .join("block_animations");

    fs::create_dir_all(&cache_dir).context("Failed to create animation cache directory")?;

    Ok(cache_dir)
}

/// Get cache file path for extracted animation data
fn get_animation_cache_file(version: &str) -> Result<PathBuf> {
    let cache_dir = get_animation_cache_dir()?;
    Ok(cache_dir.join(format!("{}.json", version)))
}

/// Check if animation data is cached for a version
pub fn is_animation_data_cached(version: &str) -> Result<bool> {
    Ok(load_cached_animation_data(version)?.is_some())
}

/// Load cached animation data
pub fn load_cached_animation_data(version: &str) -> Result<Option<ExtractedAnimationData>> {
    let cache_file = get_animation_cache_file(version)?;

    if !cache_file.exists() {
        return Ok(None);
    }

    let content = match fs::read_to_string(&cache_file) {
        Ok(content) => content,
        Err(error) => {
            println!(
                "[block_animations] Failed to read animation cache for {}: {}",
                version, error
            );
            return Ok(None);
        }
    };

    let data: ExtractedAnimationData = match serde_json::from_str(&content) {
        Ok(data) => data,
        Err(error) => {
            println!(
                "[block_animations] Failed to parse animation cache for {}: {}",
                version, error
            );
            return Ok(None);
        }
    };

    // Schema version check
    const CURRENT_SCHEMA_VERSION: u32 = 3;
    if data.schema_version < CURRENT_SCHEMA_VERSION {
        println!(
            "[block_animations] Cached animation schema {} is older than {}, re-extracting...",
            data.schema_version, CURRENT_SCHEMA_VERSION
        );
        return Ok(None);
    }

    if data.entities.is_empty() && data.mob_models.is_empty() {
        println!(
            "[block_animations] Cached animations for {} has no data, re-extracting...",
            version
        );
        return Ok(None);
    }

    Ok(Some(data))
}

/// Save animation data to cache
fn save_animation_data_to_cache(data: &ExtractedAnimationData) -> Result<()> {
    let cache_file = get_animation_cache_file(&data.version)?;
    let content = serde_json::to_string_pretty(data).context("Failed to serialize animation data")?;
    fs::write(&cache_file, content).context("Failed to write animation cache file")?;

    println!(
        "[block_animations] Cached animation data for version {} ({} blocks, {} mobs)",
        data.version,
        data.entities.len(),
        data.mob_models.len()
    );

    Ok(())
}

/// Main extraction function - extracts animations from a Minecraft JAR
pub async fn extract_block_animations(
    jar_path: &Path,
    version: &str,
) -> Result<ExtractedAnimationData> {
    // Check cache first
    if let Some(cached) = load_cached_animation_data(version)? {
        println!(
            "[block_animations] Using cached animation data for {}",
            version
        );
        return Ok(cached);
    }

    println!(
        "[block_animations] Extracting animations for Minecraft {}...",
        version
    );

    // Reuse particle extractor infrastructure for decompilation and mappings
    use super::particle_physics_extractor::{download_mojang_mappings, ensure_cfr_available};

    // Download mappings
    let mappings_path = download_mojang_mappings(version).await?;
    let class_mappings = parse_class_mappings(&mappings_path)?;

    // Get decompile directory (shared with particle physics extractor)
    let physics_cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Could not find cache directory"))?
        .join("weaverbird")
        .join("particle_physics");
    let decompile_dir = physics_cache_dir.join("decompiled").join(version);

    // Decompile if needed
    if !decompile_dir.exists() || !has_required_classes(&decompile_dir, &class_mappings) {
        let cfr_path = ensure_cfr_available().await?;
        decompile_animation_classes(&cfr_path, jar_path, &decompile_dir, &mappings_path, &class_mappings)?;
    } else {
        println!(
            "[block_animations] Using cached decompiled source at {:?}",
            decompile_dir
        );
    }

    // Extract animations from decompiled classes
    let mut entities = HashMap::new();

    // Extract block entity keyframe animations (data-driven discovery)
    extract_all_block_animations(&decompile_dir, &class_mappings, &mut entities)?;

    // Extract mob model JPM animations (data-driven discovery)
    let mut mob_models = HashMap::new();
    extract_mob_models(&decompile_dir, &class_mappings, &mut mob_models)?;

    let data = ExtractedAnimationData {
        schema_version: 3, // Bumped for duration_ticks field
        version: version.to_string(),
        entities,
        mob_models,
    };

    // Save to cache
    save_animation_data_to_cache(&data)?;

    println!(
        "[block_animations] Successfully extracted animations: {} block entities, {} mob models",
        data.entities.len(),
        data.mob_models.len()
    );

    Ok(data)
}

/// Parse Mojang mappings to get class name mappings
fn parse_class_mappings(mappings_path: &Path) -> Result<HashMap<String, String>> {
    let content = fs::read_to_string(mappings_path).context("Failed to read mappings file")?;
    let mut mappings = HashMap::new();

    for line in content.lines() {
        // Format: "deobf.class.Name -> obf:"
        if let Some(arrow_pos) = line.find(" -> ") {
            let deobf = line[..arrow_pos].trim();
            let obf = line[arrow_pos + 4..].trim().trim_end_matches(':');
            mappings.insert(obf.to_string(), deobf.to_string());
        }
    }

    Ok(mappings)
}

/// Check if required classes are decompiled
fn has_required_classes(decompile_dir: &Path, _class_mappings: &HashMap<String, String>) -> bool {
    // Check for at least one block entity class
    let bell_path = decompile_dir.join("net/minecraft/world/level/block/entity/BellBlockEntity.java");
    bell_path.exists()
}

/// Decompile classes needed for animation extraction
fn decompile_animation_classes(
    cfr_path: &Path,
    jar_path: &Path,
    output_dir: &Path,
    mappings_path: &Path,
    class_mappings: &HashMap<String, String>,
) -> Result<()> {
    use std::process::Command;
    use std::collections::HashSet;

    println!("[block_animations] Decompiling animation classes...");

    fs::create_dir_all(output_dir).context("Failed to create decompile directory")?;

    let mut classes_to_decompile: HashSet<String> = HashSet::new();

    // Packages we need for animation extraction
    let packages_to_decompile = vec![
        "net.minecraft.world.level.block.entity",  // Block entities
        "net.minecraft.world.entity",              // Living entities (mobs)
        "net.minecraft.client.model",              // Entity models
    ];

    for package in &packages_to_decompile {
        let package_prefix = format!("{}.", package);
        for (obf, deobf) in class_mappings {
            if deobf.starts_with(&package_prefix) || deobf == *package {
                classes_to_decompile.insert(obf.clone());
            }
        }
    }

    if classes_to_decompile.is_empty() {
        return Err(anyhow!("No classes found to decompile"));
    }

    let obf_refs: Vec<String> = classes_to_decompile.into_iter().collect();
    let mut args = vec![
        "-jar",
        cfr_path.to_str().unwrap(),
        jar_path.to_str().unwrap(),
        "--outputdir",
        output_dir.to_str().unwrap(),
        "--obfuscationpath",
        mappings_path.to_str().unwrap(),
    ];

    for obf in &obf_refs {
        args.push(obf);
    }

    let output = Command::new("java")
        .args(&args)
        .output()
        .context("Failed to run CFR decompiler")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("Exception") || stderr.contains("Error:") {
            return Err(anyhow!("CFR decompilation failed: {}", stderr));
        }
    }

    println!("[block_animations] ✓ Class decompilation complete ({} classes)", obf_refs.len());
    Ok(())
}

/// Extract all block entity animations by scanning the decompiled directory (data-driven)
fn extract_all_block_animations(
    decompile_dir: &Path,
    _class_mappings: &HashMap<String, String>,
    entities: &mut HashMap<String, EntityAnimations>,
) -> Result<()> {
    let block_entity_dir = decompile_dir.join("net/minecraft/world/level/block/entity");

    if !block_entity_dir.exists() {
        println!("[block_animations] BlockEntity directory not found, skipping block animations");
        return Ok(());
    }

    // Scan for all *BlockEntity.java files
    let entries = fs::read_dir(&block_entity_dir)
        .context("Failed to read block entity directory")?;

    let mut scanned_count = 0;
    for entry in entries {
        scanned_count += 1;
        let entry = entry?;
        let path = entry.path();

        // Only process Java files ending with BlockEntity.java
        if !path.is_file() || !path.extension().map_or(false, |ext| ext == "java") {
            continue;
        }

        let file_name = path.file_stem().unwrap().to_str().unwrap();
        if !file_name.ends_with("BlockEntity") {
            continue;
        }

        // Extract entity ID from class name
        // BellBlockEntity -> bell
        // ChestBlockEntity -> chest
        let entity_id = file_name
            .strip_suffix("BlockEntity")
            .unwrap()
            .to_lowercase();

        // Try to extract animations from this block entity
        if let Ok(animations) = extract_block_entity_animations(&path, &entity_id) {
            if !animations.is_empty() {
                let anim_count = animations.len();
                entities.insert(
                    entity_id.clone(),
                    EntityAnimations {
                        entity_id: entity_id.clone(),
                        animations,
                    },
                );
                println!(
                    "[block_animations]   ✓ {} ({} animations)",
                    entity_id,
                    anim_count
                );
            }
        }
    }

    println!(
        "[block_animations] Scanned {} files, extracted {} block entity animations",
        scanned_count,
        entities.len()
    );

    Ok(())
}

/// Extract animations from a single block entity class file (generic pattern detection)
fn extract_block_entity_animations(
    class_path: &Path,
    entity_id: &str,
) -> Result<Vec<Animation>> {
    let source = fs::read_to_string(class_path)
        .context(format!("Failed to read {}", class_path.display()))?;

    let mut animations = Vec::new();

    // Pattern 1: Tick-based animations (bell, etc.)
    // Look for: ringingTicks, openness, etc.
    if let Some(anim) = extract_tick_based_rotation(&source, entity_id)? {
        animations.push(anim);
    }

    // Pattern 2: Openness-based animations (chest, shulker, etc.)
    // Look for: openNess field and lid rotation
    if let Some(anim) = extract_openness_animation(&source, entity_id)? {
        animations.push(anim);
    }

    Ok(animations)
}

/// Extract tick-based rotation animations (e.g., bell ringing)
fn extract_tick_based_rotation(
    source: &str,
    entity_id: &str,
) -> Result<Option<Animation>> {
    // Look for tick counter fields: ringingTicks, swingingTicks, etc.
    let tick_field_re = Regex::new(r"(\w+Ticks)\s*<\s*(\d+)")?;

    let (tick_field, duration_ticks) = match tick_field_re.captures(source) {
        Some(caps) => {
            let field = caps.get(1).unwrap().as_str();
            let ticks = caps.get(2).unwrap().as_str().parse::<u32>().unwrap_or(50);
            (field, ticks)
        }
        None => return Ok(None),
    };

    // Check if this is a rotation-based animation
    // Look for rotation calculations involving the tick field
    let rotation_re = Regex::new(&format!(r"(?i)rotat|angle.*{}", tick_field))?;
    if !rotation_re.is_match(source) {
        return Ok(None);
    }

    // Determine animation name from tick field
    // ringingTicks -> ring, swingingTicks -> swing, etc.
    let anim_name = tick_field
        .strip_suffix("Ticks")
        .or_else(|| tick_field.strip_suffix("ticks"))
        .unwrap_or(tick_field)
        .replace("ing", "")
        .to_lowercase();

    // Create smooth swing animation (typical pattern for tick-based animations)
    let max_angle = 45.0; // Default rotation angle
    let keyframes = vec![
        Keyframe { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
        Keyframe { time: 0.25, value: max_angle * 0.707, interpolation: "smooth".to_string() },
        Keyframe { time: 0.5, value: max_angle, interpolation: "smooth".to_string() },
        Keyframe { time: 0.75, value: max_angle * 0.707, interpolation: "smooth".to_string() },
        Keyframe { time: 1.0, value: 0.0, interpolation: "smooth".to_string() },
    ];

    // Determine which part rotates (body, base, etc.)
    let part_name = format!("{}_body", entity_id);

    let mut parts = HashMap::new();
    parts.insert(
        part_name,
        PartAnimation {
            rotation_x: Some(keyframes),
            rotation_y: None,
            rotation_z: None,
            position_x: None,
            position_y: None,
            position_z: None,
        },
    );

    Ok(Some(Animation {
        name: anim_name,
        trigger: AnimationTrigger::Interact,
        duration_ticks,
        looping: false,
        parts,
    }))
}

/// Extract openness-based animations (chest, shulker, etc.)
fn extract_openness_animation(
    source: &str,
    _entity_id: &str,
) -> Result<Option<Animation>> {
    // Look for openNess field (standard Minecraft pattern)
    if !source.contains("openNess") && !source.contains("openness") {
        return Ok(None);
    }

    // Check for lid or similar part
    if !source.contains("lid") && !source.contains("Lid") {
        return Ok(None);
    }

    // Determine if this has position animation (shulker) or just rotation (chest)
    let has_position = source.contains("ShulkerBox");

    let rotation_keyframes = vec![
        Keyframe { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
        Keyframe { time: 1.0, value: 90.0, interpolation: "linear".to_string() },
    ];

    let position_keyframes = if has_position {
        Some(vec![
            Keyframe { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
            Keyframe { time: 1.0, value: 0.5, interpolation: "linear".to_string() },
        ])
    } else {
        None
    };

    let mut parts = HashMap::new();
    parts.insert(
        "lid".to_string(),
        PartAnimation {
            rotation_x: Some(rotation_keyframes),
            rotation_y: None,
            rotation_z: None,
            position_x: None,
            position_y: position_keyframes,
            position_z: None,
        },
    );

    Ok(Some(Animation {
        name: "open".to_string(),
        trigger: AnimationTrigger::Interact,
        duration_ticks: 10,
        looping: false,
        parts,
    }))
}

/// DEPRECATED: Old hardcoded bell extraction (kept for reference, remove after testing)
#[allow(dead_code)]
fn extract_bell_animation(
    decompile_dir: &Path,
    _class_mappings: &HashMap<String, String>,
    entities: &mut HashMap<String, EntityAnimations>,
) -> Result<()> {
    let bell_path = decompile_dir.join("net/minecraft/world/level/block/entity/BellBlockEntity.java");

    if !bell_path.exists() {
        println!("[block_animations] BellBlockEntity.java not found, skipping bell animation");
        return Ok(());
    }

    let source = fs::read_to_string(&bell_path).context("Failed to read BellBlockEntity.java")?;

    // Extract bell animation parameters
    // Look for: this.ringingTicks, rotation calculation patterns
    let mut duration_ticks = 50; // Default duration

    // Pattern: this.ringingTicks (usually 50 in vanilla)
    let duration_re = Regex::new(r"this\.ringingTicks\s*<\s*(\d+)")?;
    if let Some(caps) = duration_re.captures(&source) {
        if let Ok(ticks) = caps.get(1).unwrap().as_str().parse::<u32>() {
            duration_ticks = ticks;
        }
    }

    // Create bell ring animation
    // Bell rotates on X-axis using sine wave pattern
    // Formula from vanilla: rotation = sin(ticks / total_ticks * PI) * max_angle
    let max_angle = 45.0; // Bell rotates ±45 degrees at peak
    let keyframes = vec![
        Keyframe { time: 0.0, value: 0.0, interpolation: "linear".to_string() },
        Keyframe { time: 0.25, value: max_angle * 0.707, interpolation: "smooth".to_string() }, // sin(PI/4)
        Keyframe { time: 0.5, value: max_angle, interpolation: "smooth".to_string() },         // sin(PI/2) = 1
        Keyframe { time: 0.75, value: max_angle * 0.707, interpolation: "smooth".to_string() },
        Keyframe { time: 1.0, value: 0.0, interpolation: "smooth".to_string() },
    ];

    let mut parts = HashMap::new();
    parts.insert(
        "bell_body".to_string(),
        PartAnimation {
            rotation_x: Some(keyframes),
            rotation_y: None,
            rotation_z: None,
            position_x: None,
            position_y: None,
            position_z: None,
        },
    );

    let animation = Animation {
        name: "ring".to_string(),
        trigger: AnimationTrigger::Interact,
        duration_ticks,
        looping: false,
        parts,
    };

    entities.insert(
        "bell".to_string(),
        EntityAnimations {
            entity_id: "bell".to_string(),
            animations: vec![animation],
        },
    );

    println!("[block_animations] ✓ Extracted bell animation (duration: {} ticks)", duration_ticks);
    Ok(())
}

/// Extract mob model JPM animations (data-driven discovery)
/// Scans for all model classes and extracts their setupAnim() methods as JPM expressions
fn extract_mob_models(
    decompile_dir: &Path,
    _class_mappings: &HashMap<String, String>,
    mob_models: &mut HashMap<String, MobModel>,
) -> Result<()> {
    let model_dir = decompile_dir.join("net/minecraft/client/model");

    if !model_dir.exists() {
        println!("[block_animations] Model directory not found, skipping mob animations");
        return Ok(());
    }

    // Recursively scan for all *Model.java files
    scan_model_directory(&model_dir, mob_models)?;

    println!(
        "[block_animations] ✓ Extracted {} mob models",
        mob_models.len()
    );

    Ok(())
}

/// Recursively scan a directory for Model files
fn scan_model_directory(dir: &Path, mob_models: &mut HashMap<String, MobModel>) -> Result<()> {
    let entries = fs::read_dir(dir)
        .context(format!("Failed to read directory: {}", dir.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        // Recurse into subdirectories
        if path.is_dir() {
            scan_model_directory(&path, mob_models)?;
            continue;
        }

        // Only process Java files ending with Model.java
        if !path.is_file() || !path.extension().map_or(false, |ext| ext == "java") {
            continue;
        }

        let file_name = path.file_stem().unwrap().to_str().unwrap();
        if !file_name.ends_with("Model") {
            continue;
        }

        // Skip abstract base models and non-entity models
        if file_name.starts_with("Hierarchical")
            || file_name.starts_with("Ageable")
            || file_name.starts_with("Quadruped")
            || file_name.starts_with("Abstract")
            || file_name.starts_with("Layered")
            || file_name.ends_with("Base")
            || file_name == "EntityModel"
            || file_name == "Model"
        {
            continue;
        }

        // Extract entity ID from model class name
        // ZombieModel -> zombie
        // BellModel -> bell
        // ChestModel -> chest
        let entity_id = file_name
            .strip_suffix("Model")
            .unwrap()
            .to_lowercase();

        // Try to extract JPM animations from this model
        if let Ok(model) = extract_single_mob_model_from_path(&path, &entity_id) {
            mob_models.insert(entity_id.clone(), model);
        }
    }

    Ok(())
}

/// Detect if a model is a block entity (vs mob) based on path
/// Block entities are in `/model/object/` subdirectory
fn is_block_entity(model_path: &Path) -> bool {
    model_path.to_str()
        .map(|s| s.contains("/client/model/object/"))
        .unwrap_or(false)
}

/// Extract a single mob model from a file path (data-driven)
fn extract_single_mob_model_from_path(
    model_path: &Path,
    entity_id: &str,
) -> Result<MobModel> {
    let source = fs::read_to_string(model_path)
        .context(format!("Failed to read {}", model_path.display()))?;

    // Detect if this is a block entity
    let is_block = is_block_entity(model_path);

    // Parse the setupAnim() or prepareMobModel() method
    let animation_layers = parse_setup_anim_method(&source, entity_id, is_block)?;

    if animation_layers.is_empty() {
        return Err(anyhow!("No animation expressions found for {}", entity_id));
    }

    // Extract model hierarchy from createBodyLayer() method
    let hierarchy = extract_model_hierarchy(&source, entity_id, is_block);

    // Detect trigger for block entities
    let trigger = if is_block {
        // Collect all expressions to analyze
        let all_expressions: HashMap<String, String> = animation_layers
            .iter()
            .flat_map(|layer| layer.expressions.clone())
            .collect();
        Some(detect_trigger(&all_expressions))
    } else {
        None
    };

    // Extract duration from corresponding BlockEntity class for block entities
    let duration_ticks = if is_block {
        extract_block_entity_duration(model_path, entity_id)
    } else {
        None
    };

    let hierarchy_info = if !hierarchy.is_empty() {
        format!(", {} bones in hierarchy", hierarchy.len())
    } else {
        String::new()
    };

    let duration_info = if let Some(dur) = duration_ticks {
        format!(", duration: {} ticks", dur)
    } else {
        String::new()
    };

    println!(
        "[block_animations]   ✓ {} ({} expressions{}{}{})",
        entity_id,
        animation_layers.iter().map(|l| l.expressions.len()).sum::<usize>(),
        if let Some(ref t) = trigger { format!(", trigger: {:?}", t) } else { String::new() },
        hierarchy_info,
        duration_info
    );

    Ok(MobModel {
        entity_id: entity_id.to_string(),
        animation_layers,
        trigger,
        is_block_entity: is_block,
        hierarchy,
        duration_ticks,
    })
}

/// Extract animation duration from the corresponding BlockEntity class
/// Looks for patterns like:
///   - private static final int DURATION = 50;
///   - if (this.ringingTicks >= 50)
///   - $N.ticks >= 50
fn extract_block_entity_duration(model_path: &Path, entity_id: &str) -> Option<u32> {
    // BlockEntity classes are in a different directory than Model classes
    // Model: net/minecraft/client/model/BellModel.java
    // BlockEntity: net/minecraft/world/level/block/entity/BellBlockEntity.java

    // Navigate from model path to block entity path
    // model_path: .../net/minecraft/client/model/BellModel.java
    // We need: .../net/minecraft/world/level/block/entity/BellBlockEntity.java

    let model_path_str = model_path.to_string_lossy();

    // Find the decompile root directory (contains net/minecraft)
    let decompile_root = if let Some(pos) = model_path_str.find("/net/minecraft/") {
        &model_path_str[..pos]
    } else {
        return None;
    };

    // Construct block entity class name
    // bell -> BellBlockEntity
    let pascal_case_entity = to_pascal_case(entity_id);
    let block_entity_class = format!("{}BlockEntity", pascal_case_entity);
    let block_entity_path = format!(
        "{}/net/minecraft/world/level/block/entity/{}.java",
        decompile_root, block_entity_class
    );

    let block_entity_source = match fs::read_to_string(&block_entity_path) {
        Ok(source) => source,
        Err(_) => {
            // BlockEntity class not found - this is normal for non-block entities
            return None;
        }
    };

    // Pattern 1: static final DURATION constant
    // private static final int DURATION = 50;
    let duration_const_re = Regex::new(r"(?:private\s+)?static\s+final\s+int\s+DURATION\s*=\s*(\d+)").ok()?;
    if let Some(caps) = duration_const_re.captures(&block_entity_source) {
        if let Ok(duration) = caps.get(1).unwrap().as_str().parse::<u32>() {
            return Some(duration);
        }
    }

    // Pattern 2: Tick comparison in code
    // if (this.ringingTicks >= 50) or if ($3.ticks >= 50)
    let ticks_comparison_re = Regex::new(r"(?:this\.\w+Ticks|\$\$?\d+\.ticks)\s*>=\s*(\d+)").ok()?;
    if let Some(caps) = ticks_comparison_re.captures(&block_entity_source) {
        if let Ok(duration) = caps.get(1).unwrap().as_str().parse::<u32>() {
            return Some(duration);
        }
    }

    // Pattern 3: Generic tick field comparison (covers obfuscated code)
    // Pattern like: $3.xyz >= 50 where xyz might be an obfuscated field name
    let generic_ticks_re = Regex::new(r"\$\$?\d+\.\w+\s*>=\s*(\d+)").ok()?;
    if let Some(caps) = generic_ticks_re.captures(&block_entity_source) {
        if let Ok(duration) = caps.get(1).unwrap().as_str().parse::<u32>() {
            return Some(duration);
        }
    }

    None
}

/// Convert entity_id (snake_case/lowercase) to PascalCase for class name lookup
fn to_pascal_case(s: &str) -> String {
    s.split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

/// Extract model hierarchy from createBodyLayer() or similar methods
/// Looks for patterns like:
///   PartDefinition $$2 = $$1.addOrReplaceChild("part_name", ...);
///   $$2.addOrReplaceChild("child_name", ...);
/// Returns a map of bone_name -> parent_bone_name (None for root bones)
fn extract_model_hierarchy(source: &str, entity_id: &str, is_block_entity: bool) -> HashMap<String, Option<String>> {
    let mut hierarchy: HashMap<String, Option<String>> = HashMap::new();

    // Track variable -> part name mappings
    // e.g., $$1 = root, $$2 = "bell_body"
    let mut var_to_part: HashMap<String, String> = HashMap::new();

    // First, resolve all string constants (like BELL_BODY = "bell_body")
    let const_def_re = Regex::new(r#"private\s+static\s+final\s+String\s+([A-Z_]+)\s*=\s*"([^"]+)""#).unwrap();
    let mut constants: HashMap<String, String> = HashMap::new();
    for caps in const_def_re.captures_iter(source) {
        let const_name = caps.get(1).unwrap().as_str();
        let const_value = caps.get(2).unwrap().as_str();
        constants.insert(const_name.to_string(), const_value.to_string());
    }

    // Pattern for getting root: PartDefinition $$1 = $$0.getRoot();
    let root_re = Regex::new(r"PartDefinition\s+(\$\$\d+)\s*=\s*\$\$\d+\.getRoot\(\)").unwrap();
    if let Some(caps) = root_re.captures(source) {
        let var_name = caps.get(1).unwrap().as_str();
        var_to_part.insert(var_name.to_string(), "root".to_string());
    }

    // Pattern 1: WITH result variable assignment
    // PartDefinition $$2 = $$1.addOrReplaceChild("part_name", ...);
    // PartDefinition $$2 = $$1.addOrReplaceChild(CONST_NAME, ...);
    let add_child_with_result_re = Regex::new(
        r#"PartDefinition\s+(\$\$\d+)\s*=\s*(\$\$\d+)\.addOrReplaceChild\s*\(\s*(?:"([^"]+)"|([A-Z_]+))"#
    ).unwrap();

    // Pattern 2: WITHOUT result variable (just method call)
    // $$2.addOrReplaceChild("child_name", ...);
    // $$2.addOrReplaceChild(CONST_NAME, ...);
    let add_child_no_result_re = Regex::new(
        r#"(\$\$\d+)\.addOrReplaceChild\s*\(\s*(?:"([^"]+)"|([A-Z_]+))"#
    ).unwrap();

    // Helper to resolve part name (handles both string literals and constants)
    let resolve_part_name = |string_lit: Option<regex::Match>, const_ref: Option<regex::Match>| -> Option<String> {
        if let Some(m) = string_lit {
            Some(m.as_str().to_string())
        } else if let Some(m) = const_ref {
            constants.get(m.as_str()).cloned()
        } else {
            None
        }
    };

    // Helper to convert part name to bone name
    let to_bone_name = |part_name: &str| -> String {
        let mut bone_name = camel_to_snake_case(part_name);
        if is_block_entity {
            bone_name = strip_entity_prefix(&bone_name, entity_id);
        }
        bone_name
    };

    // Helper to get parent bone from var_to_part
    let get_parent_bone = |parent_var: &str, var_to_part: &HashMap<String, String>| -> Option<String> {
        var_to_part.get(parent_var).and_then(|p| {
            if p == "root" {
                None
            } else {
                Some(to_bone_name(p))
            }
        })
    };

    // First pass: Process calls WITH result variable (these define new variables)
    for caps in add_child_with_result_re.captures_iter(source) {
        let result_var = caps.get(1).unwrap().as_str();
        let parent_var = caps.get(2).unwrap().as_str();

        if let Some(part_name) = resolve_part_name(caps.get(3), caps.get(4)) {
            // Store the variable -> part mapping
            var_to_part.insert(result_var.to_string(), part_name.clone());

            let bone_name = to_bone_name(&part_name);
            let parent_bone = get_parent_bone(parent_var, &var_to_part);

            hierarchy.insert(bone_name, parent_bone);
        }
    }

    // Second pass: Process calls WITHOUT result variable
    // These don't create new variables, just add children
    for caps in add_child_no_result_re.captures_iter(source) {
        let parent_var = caps.get(1).unwrap().as_str();

        // Skip if this is actually a WITH-result call (already processed)
        let match_str = caps.get(0).unwrap().as_str();
        if source[..source.find(match_str).unwrap_or(0)].ends_with("= ") {
            continue;
        }

        if let Some(part_name) = resolve_part_name(caps.get(2), caps.get(3)) {
            let bone_name = to_bone_name(&part_name);

            // Only add if not already in hierarchy (from first pass)
            if !hierarchy.contains_key(&bone_name) {
                let parent_bone = get_parent_bone(parent_var, &var_to_part);
                hierarchy.insert(bone_name, parent_bone);
            }
        }
    }

    hierarchy
}

/// Parse setupAnim() method and convert Java expressions to JPM format
fn parse_setup_anim_method(source: &str, entity_id: &str, is_block_entity: bool) -> Result<Vec<JPMAnimationLayer>> {
    // Try AST-based parsing first (100% accurate, handles all Java constructs)
    match super::java_ast_parser::parse_setup_anim_ast(source, entity_id, is_block_entity) {
        Ok(expressions) => {
            if !expressions.is_empty() {
                return Ok(vec![JPMAnimationLayer { expressions }]);
            }
        }
        Err(e) => {
            // AST parsing failed, fall back to regex parsing
            println!("[block_animations] AST parsing failed for {}: {}, trying regex fallback", entity_id, e);
        }
    }

    // Fall back to regex-based parsing
    // Find setupAnim method - use greedy match and look for method-level closing brace
    // The pattern matches from "public void setupAnim" to the closing brace at the same indentation level
    let setup_anim_re = Regex::new(
        r"(?s)public\s+void\s+setupAnim\([^)]+\)\s*\{(.+?)\n    \}"
    )?;

    let method_body = setup_anim_re
        .captures(source)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str())
        .ok_or_else(|| anyhow!("setupAnim method not found for {}", entity_id))?;

    // Try complex regex parsing first (handles switch statements, local variables)
    if let Ok(layers) = parse_complex_animation_logic(method_body, entity_id, is_block_entity) {
        if !layers.is_empty() {
            return Ok(layers);
        }
    }

    // Fall back to simple assignment parsing
    parse_simple_assignments(method_body, entity_id, is_block_entity)
}

/// Parse complex animation logic with local variables and control flow
fn parse_complex_animation_logic(method_body: &str, entity_id: &str, is_block_entity: bool) -> Result<Vec<JPMAnimationLayer>> {
    let mut expressions = HashMap::new();

    // Step 1: Extract ALL local variable declarations
    let mut local_vars = HashMap::new();

    // Pattern: float $$1 = expression; or float $$1 = 0.0f;
    let var_decl_re = Regex::new(r"float\s+(\$\$\d+)\s*=\s*([^;]+);")?;
    for caps in var_decl_re.captures_iter(method_body) {
        let var_name = caps.get(1).unwrap().as_str();
        let var_value = caps.get(2).unwrap().as_str().trim();
        local_vars.insert(var_name.to_string(), var_value.to_string());
    }

    // Step 2: Parse ALL assignment statements (including those in switch/if blocks)
    // This captures reassignments that override the initial values
    let all_assign_re = Regex::new(r"(\$\$\d+)\s*=\s*([^;]+);")?;
    for assign_match in all_assign_re.captures_iter(method_body) {
        let var_name = assign_match.get(1).unwrap().as_str();
        let var_value = assign_match.get(2).unwrap().as_str().trim();

        // Check if this is a reassignment (not the initial float declaration)
        let is_declaration = method_body.contains(&format!("float {} =", var_name)) &&
                             method_body.find(&format!("float {} =", var_name)).unwrap() ==
                             assign_match.get(0).unwrap().start() - "float ".len();

        if !is_declaration {
            // This is a reassignment - update the variable's value
            local_vars.insert(var_name.to_string(), var_value.to_string());
        }
    }

    // Step 3: Parse final assignments to model parts, substituting local variables
    // Match assignments but not if they contain control flow keywords or opening braces
    let assignment_re = Regex::new(
        r"this\.(\w+)\.(xRot|yRot|zRot|x|y|z)\s*=\s*([^;\n]+?);"
    )?;

    for caps in assignment_re.captures_iter(method_body) {
        let part_name = caps.get(1).unwrap().as_str();
        let property = caps.get(2).unwrap().as_str();
        let mut java_expr = caps.get(3).unwrap().as_str().trim().to_string();

        // Skip expressions that contain control flow keywords, comparisons, or blocks
        if java_expr.contains(" if ") || java_expr.contains(" else ") ||
           java_expr.contains(" while ") || java_expr.contains(" for ") ||
           java_expr.contains(") {") || java_expr.contains("} else") ||
           java_expr.contains(" > ") || java_expr.contains(" < ") ||
           java_expr.contains("\n") || java_expr.len() > 500 {
            continue;
        }

        // Handle compound assignments
        let mut all_parts = vec![part_name.to_string()];
        if java_expr.contains(" = ") {
            let compound_re = Regex::new(&format!(
                r"this\.(\w+)\.{}\s*=\s*",
                regex::escape(property)
            )).unwrap();

            for compound_match in compound_re.find_iter(&java_expr) {
                if let Some(cap) = compound_re.captures(compound_match.as_str()) {
                    let additional_part = cap.get(1).unwrap().as_str();
                    all_parts.push(additional_part.to_string());
                }
            }

            if let Some(last_assign_pos) = java_expr.rfind(" = ") {
                java_expr = java_expr[last_assign_pos + 3..].trim().to_string();
            }
        }

        // Recursively substitute local variables (handles $$1 = $$3, $$3 = expr)
        // Do multiple passes to resolve nested substitutions
        for _ in 0..10 {  // Max 10 levels of nesting
            let mut substituted = false;
            for (var_name, var_value) in &local_vars {
                // Only substitute if the value is not a simple default (0.0f, 0, etc.)
                if !var_value.starts_with("0") && !var_value.is_empty() {
                    let before = java_expr.clone();

                    // For $$ variables, use simple string replacement
                    // We can't use lookahead in Rust regex, so just do exact string replacement
                    if var_name.starts_with("$$") {
                        // Simple approach: replace all occurrences, being careful about $$1 vs $$10
                        // We'll iterate from longest to shortest to avoid partial matches
                        java_expr = java_expr.replace(var_name, var_value.as_str());
                    } else {
                        // For regular variables, use word boundaries
                        let var_pattern = format!(r"\b{}\b", regex::escape(var_name));
                        let var_re = Regex::new(&var_pattern)?;
                        java_expr = var_re.replace_all(&java_expr, var_value.as_str()).to_string();
                    }

                    if java_expr != before {
                        substituted = true;
                    }
                }
            }

            // If no substitutions were made, we're done
            if !substituted {
                break;
            }
        }

        // Skip if the final expression is just a zero/default value
        if java_expr == "0.0f" || java_expr == "0.0" || java_expr == "0" {
            continue;
        }

        // Convert Java expression to JPM format
        let jpm_expr = convert_java_to_jpm_expression(&java_expr);

        // Map Java property names to JPM
        let jpm_property = match property {
            "xRot" => "rx",
            "yRot" => "ry",
            "zRot" => "rz",
            "x" => "tx",
            "y" => "ty",
            "z" => "tz",
            _ => property,
        };

        // Create JPM property path for all parts involved
        for part in &all_parts {
            let mut part_snake = camel_to_snake_case(part);
            // For block entities, strip the entity name prefix (e.g., "bell_body" → "body")
            if is_block_entity {
                part_snake = strip_entity_prefix(&part_snake, entity_id);
            }
            let property_path = format!("{}.{}", part_snake, jpm_property);
            expressions.insert(property_path, jpm_expr.clone());
        }
    }

    if expressions.is_empty() {
        return Err(anyhow!("No animation expressions found in complex parsing"));
    }

    Ok(vec![JPMAnimationLayer { expressions }])
}

/// Simple assignment parsing fallback
fn parse_simple_assignments(method_body: &str, entity_id: &str, is_block_entity: bool) -> Result<Vec<JPMAnimationLayer>> {
    let assignment_re = Regex::new(
        r"this\.(\w+)\.(xRot|yRot|zRot|x|y|z)\s*=\s*([^;\n]+?);"
    )?;

    let mut expressions = HashMap::new();

    for caps in assignment_re.captures_iter(method_body) {
        let part_name = caps.get(1).unwrap().as_str();
        let property = caps.get(2).unwrap().as_str();
        let mut java_expr = caps.get(3).unwrap().as_str().trim().to_string();

        // Skip expressions that contain control flow keywords, comparisons, or blocks
        if java_expr.contains(" if ") || java_expr.contains(" else ") ||
           java_expr.contains(" while ") || java_expr.contains(" for ") ||
           java_expr.contains(") {") || java_expr.contains("} else") ||
           java_expr.contains(" > ") || java_expr.contains(" < ") ||
           java_expr.contains("\n") || java_expr.len() > 500 {
            continue;
        }

        // Handle compound assignments
        let mut all_parts = vec![part_name.to_string()];
        if java_expr.contains(" = ") {
            let compound_re = Regex::new(&format!(
                r"this\.(\w+)\.{}\s*=\s*",
                regex::escape(property)
            )).unwrap();

            for compound_match in compound_re.find_iter(&java_expr) {
                if let Some(cap) = compound_re.captures(compound_match.as_str()) {
                    let additional_part = cap.get(1).unwrap().as_str();
                    all_parts.push(additional_part.to_string());
                }
            }

            if let Some(last_assign_pos) = java_expr.rfind(" = ") {
                java_expr = java_expr[last_assign_pos + 3..].trim().to_string();
            }
        }

        // Convert Java expression to JPM format
        let jpm_expr = convert_java_to_jpm_expression(&java_expr);

        // Map Java property names to JPM
        let jpm_property = match property {
            "xRot" => "rx",
            "yRot" => "ry",
            "zRot" => "rz",
            "x" => "tx",
            "y" => "ty",
            "z" => "tz",
            _ => property,
        };

        // Create JPM property path for all parts involved
        for part in all_parts {
            let mut part_snake = camel_to_snake_case(&part);
            // For block entities, strip the entity name prefix (e.g., "bell_body" → "body")
            if is_block_entity {
                part_snake = strip_entity_prefix(&part_snake, entity_id);
            }
            let property_path = format!("{}.{}", part_snake, jpm_property);
            expressions.insert(property_path, jpm_expr.clone());
        }
    }

    if expressions.is_empty() {
        return Err(anyhow!("No animation expressions found"));
    }

    Ok(vec![JPMAnimationLayer { expressions }])
}

/// Convert camelCase to snake_case
pub fn camel_to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch.is_uppercase() {
            // Add underscore before uppercase letter (except at start)
            if !result.is_empty() {
                result.push('_');
            }
            result.push(ch.to_lowercase().next().unwrap());
        } else {
            result.push(ch);
        }
    }

    result
}

/// Strip entity name prefix from bone name (for block entities)
/// Example: "bell_body" with entity "bell" → "body"
pub fn strip_entity_prefix(bone_name: &str, entity_id: &str) -> String {
    let prefix = format!("{}_", entity_id);
    if bone_name.starts_with(&prefix) {
        bone_name.strip_prefix(&prefix).unwrap().to_string()
    } else {
        bone_name.to_string()
    }
}

/// Detect animation trigger based on state variables used in expressions
fn detect_trigger(expressions: &HashMap<String, String>) -> AnimationTrigger {
    let combined_expr = expressions.values().cloned().collect::<Vec<_>>().join(" ");

    // Check for specific state variables
    if combined_expr.contains("ticks") {
        // "ticks" variable indicates interaction-triggered animation (bell, etc.)
        AnimationTrigger::Interact
    } else if combined_expr.contains("openness") || combined_expr.contains("openNess") {
        // "openness" variable indicates interaction-triggered animation (chest, shulker)
        AnimationTrigger::Interact
    } else if combined_expr.contains("age") || combined_expr.contains("ageInTicks") {
        // "age" variable indicates continuous/idle animation
        AnimationTrigger::Always
    } else if combined_expr.contains("limb") || combined_expr.contains("walk") {
        // Walking/movement animation
        AnimationTrigger::Walk
    } else {
        // Default to always for unknown patterns
        AnimationTrigger::Always
    }
}

/// Convert Java expression to JPM expression format
pub fn convert_java_to_jpm_expression(java_expr: &str) -> String {
    let mut jpm_expr = java_expr.to_string();

    // Replace Java constants and function calls with JPM equivalents

    // Math constants
    jpm_expr = jpm_expr.replace("0.017453292F", "torad"); // degrees to radians constant
    jpm_expr = jpm_expr.replace("0.017453292f", "torad");
    jpm_expr = jpm_expr.replace("1.5707964f", "pi / 2");  // 90 degrees in radians
    jpm_expr = jpm_expr.replace("1.5707964F", "pi / 2");
    jpm_expr = jpm_expr.replace("((float)Math.PI)", "pi");
    jpm_expr = jpm_expr.replace("(float)Math.PI", "pi");
    jpm_expr = jpm_expr.replace("Math.PI", "pi");

    // MathHelper/Math functions
    jpm_expr = jpm_expr.replace("MathHelper.cos(", "cos(");
    jpm_expr = jpm_expr.replace("MathHelper.sin(", "sin(");
    jpm_expr = jpm_expr.replace("MathHelper.abs(", "abs(");
    jpm_expr = jpm_expr.replace("Mth.sin(", "sin(");
    jpm_expr = jpm_expr.replace("Mth.cos(", "cos(");
    jpm_expr = jpm_expr.replace("Mth.abs(", "abs(");
    jpm_expr = jpm_expr.replace("Math.cos(", "cos(");
    jpm_expr = jpm_expr.replace("Math.sin(", "sin(");
    jpm_expr = jpm_expr.replace("Math.abs(", "abs(");
    jpm_expr = jpm_expr.replace("Math.max(", "max(");
    jpm_expr = jpm_expr.replace("Math.min(", "min(");

    // Convert Mth.rotLerpRad(factor, from, to) → lerp(from, to, factor)
    // Minecraft: rotLerpRad(delta, from, to) = from + (to - from) * delta
    // JPM: lerp(from, to, factor) = from + (to - from) * factor
    let rotlerp_re = Regex::new(r"Mth\.rotLerpRad\(([^,]+),\s*([^,]+),\s*([^)]+)\)").unwrap();
    jpm_expr = rotlerp_re.replace_all(&jpm_expr, "lerp($2, $3, $1)").to_string();

    // Convert property references: this.partName.xRot → part_name.rx
    let prop_ref_re = Regex::new(r"this\.(\w+)\.(xRot|yRot|zRot|x|y|z)\b").unwrap();
    jpm_expr = prop_ref_re.replace_all(&jpm_expr, |caps: &regex::Captures| {
        let part_camel = &caps[1];
        let part_snake = camel_to_snake_case(part_camel);
        let property = match &caps[2] {
            "xRot" => "rx",
            "yRot" => "ry",
            "zRot" => "rz",
            "x" => "tx",
            "y" => "ty",
            "z" => "tz",
            other => other,
        };
        format!("{}.{}", part_snake, property)
    }).to_string();

    // Convert array access: this.bodyParts[2].yRot → body_parts[2].ry
    let array_ref_re = Regex::new(r"this\.(\w+)\[(\d+)\]\.(xRot|yRot|zRot|x|y|z)\b").unwrap();
    jpm_expr = array_ref_re.replace_all(&jpm_expr, |caps: &regex::Captures| {
        let part_camel = &caps[1];
        let part_snake = camel_to_snake_case(part_camel);
        let index = &caps[2];
        let property = match &caps[3] {
            "xRot" => "rx",
            "yRot" => "ry",
            "zRot" => "rz",
            "x" => "tx",
            "y" => "ty",
            "z" => "tz",
            other => other,
        };
        format!("{}[{}].{}", part_snake, index, property)
    }).to_string();

    // Block entity state variables
    // BellModel: $$0.ticks -> ticks
    // ChestModel: $$0.floatValue() -> openness
    let state_var_re = Regex::new(r"\$\$0\.floatValue\(\)").unwrap();
    jpm_expr = state_var_re.replace_all(&jpm_expr, "openness").to_string();

    let ticks_re = Regex::new(r"\$\$0\.ticks").unwrap();
    jpm_expr = ticks_re.replace_all(&jpm_expr, "ticks").to_string();

    // Generic $$0, $$1, $$2 parameter references (used in deobfuscated code)
    // For now, leave these as-is since they need context to convert properly

    // Entity state parameter names (Java -> JPM)
    jpm_expr = jpm_expr.replace("limbSwing", "limb_swing");
    jpm_expr = jpm_expr.replace("limbSwingAmount", "limb_speed");
    jpm_expr = jpm_expr.replace("ageInTicks", "age");
    jpm_expr = jpm_expr.replace("netHeadYaw", "head_yaw");
    jpm_expr = jpm_expr.replace("headPitch", "head_pitch");

    // Remove Java type casts (multiple passes to handle nested casts)
    for _ in 0..3 {
        jpm_expr = jpm_expr.replace("(float)", "");
        jpm_expr = jpm_expr.replace("(double)", "");
        jpm_expr = jpm_expr.replace("(int)", "");
        jpm_expr = jpm_expr.replace("(long)", "");
    }

    // Remove type casting like (Direction) or (HumanoidRenderState)
    let type_cast_re = Regex::new(r"\([A-Z][a-zA-Z]*\)").unwrap();
    jpm_expr = type_cast_re.replace_all(&jpm_expr, "").to_string();

    // Clean up double spaces that may have been created
    while jpm_expr.contains("  ") {
        jpm_expr = jpm_expr.replace("  ", " ");
    }

    // Remove 'f' and 'F' float suffixes
    let float_suffix_re = Regex::new(r"(\d+\.?\d*)[fF]\b").unwrap();
    jpm_expr = float_suffix_re.replace_all(&jpm_expr, "$1").to_string();

    // Clean up extra whitespace
    jpm_expr = jpm_expr.trim().to_string();

    jpm_expr
}
