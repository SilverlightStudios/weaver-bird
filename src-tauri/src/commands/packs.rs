/// Commands for managing resource packs
///
/// Modern Tauri v2 pattern:
/// - Uses custom AppError type for structured error responses
/// - Validates all inputs before processing
/// - Separates concerns: validation → execution → response
/// - Reduces boilerplate with validation module
use crate::model::{OverrideSelection, ScanResult};
use crate::util::{
    asset_indexer, launcher_detection, mc_paths, pack_scanner, particle_data, texture_index,
    vanilla_textures, weaver_nest,
};
use crate::{validation, AppError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildWeaverNestRequest {
    pub packs_dir: String,
    pub pack_order: Vec<String>,
    pub overrides: HashMap<String, OverrideSelection>, // asset_id -> override payload
    pub output_dir: String,
}

/// Create a virtual vanilla pack entry
fn create_vanilla_pack() -> Result<crate::model::PackMeta, AppError> {
    let cache_dir = vanilla_textures::get_vanilla_cache_dir()
        .map_err(|e| AppError::io(format!("Failed to get vanilla cache dir: {}", e)))?;

    Ok(crate::model::PackMeta {
        id: "minecraft:vanilla".to_string(),
        name: "Minecraft (Vanilla)".to_string(),
        path: cache_dir.to_string_lossy().to_string(),
        size: 0,
        is_zip: false,
        description: Some("Default Minecraft textures".to_string()),
        icon_data: None,
        pack_format: None, // Vanilla textures don't have a pack format
    })
}

/// Scan a resource packs directory and return all packs and assets
///
/// # Errors
/// - VALIDATION_ERROR: Directory doesn't exist or is invalid
/// - SCAN_ERROR: Failed to scan packs
///
/// # Returns
/// Empty result if no packs found (not an error)
pub fn scan_packs_folder_impl(packs_dir: String) -> Result<ScanResult, AppError> {
    // Validate input
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Scan for packs
    let mut packs =
        pack_scanner::scan_packs(&packs_dir).map_err(|e| AppError::scan(e.to_string()))?;

    // Add vanilla pack at the end (lowest priority)
    let vanilla_pack = create_vanilla_pack()?;
    packs.push(vanilla_pack);

    // Index assets (including vanilla)
    let (assets, mut providers) = asset_indexer::index_assets(&packs)
        .map_err(|e| AppError::scan(format!("Asset indexing failed: {}", e)))?;

    // For each asset, ensure vanilla pack is listed as a provider if texture exists
    for asset in &assets {
        let provider_list = providers.entry(asset.id.clone()).or_insert_with(Vec::new);
        if !provider_list.contains(&"minecraft:vanilla".to_string()) {
            // Check if vanilla texture exists for this asset
            if vanilla_textures::get_vanilla_texture_path(&asset.id).is_ok() {
                provider_list.push("minecraft:vanilla".to_string());
            }
        }
    }

    Ok(ScanResult {
        packs,
        assets,
        providers,
    })
}

/// Build the Weaver Nest optimized resource pack
///
/// # Errors
/// - VALIDATION_ERROR: Invalid input parameters
/// - SCAN_ERROR: Failed to scan packs
/// - BUILD_ERROR: Failed to build output pack
pub fn build_weaver_nest_impl(request: BuildWeaverNestRequest) -> Result<String, AppError> {
    // Validate all inputs in one call
    validation::validate_build_request(
        &request.packs_dir,
        &request.pack_order,
        &request.overrides,
        &request.output_dir,
    )?;

    // Scan packs
    let packs = pack_scanner::scan_packs(&request.packs_dir)
        .map_err(|e| AppError::scan(format!("Pack scanning failed: {}", e)))?;

    if packs.is_empty() {
        return Err(AppError::scan("No packs found in specified directory"));
    }

    // Index assets
    let (assets, providers) = asset_indexer::index_assets(&packs)
        .map_err(|e| AppError::scan(format!("Asset indexing failed: {}", e)))?;

    // Build Weaver Nest
    weaver_nest::build_weaver_nest(
        &packs,
        &assets,
        &providers,
        &request.pack_order,
        &request.overrides,
        &request.output_dir,
    )
    .map_err(|e| AppError::build(format!("Weaver Nest generation failed: {}", e)))?;

    Ok(format!(
        "Weaver Nest built successfully with {} assets",
        assets.len()
    ))
}

/// Get the default Minecraft resourcepacks directory
///
/// # Returns
/// Path to the default resourcepacks directory for current platform
pub fn get_default_packs_dir_impl() -> Result<String, AppError> {
    mc_paths::get_default_resourcepacks_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| AppError::io(format!("Failed to determine default directory: {}", e)))
}

/// Initialize vanilla textures (extract from Minecraft JAR if needed)
///
/// # Arguments
/// * `window` - Tauri window handle for emitting progress events
///
/// # Returns
/// Path to the vanilla textures cache directory
pub fn initialize_vanilla_textures_impl(window: tauri::Window) -> Result<String, AppError> {
    use std::sync::Arc;
    use tauri::Emitter;

    // Create progress callback that emits events to the frontend
    let progress_callback = Arc::new(move |current: usize, total: usize| {
        println!(
            "[initialize_vanilla_textures] Emitting progress: {}/{}",
            current, total
        );
        if let Err(e) = window.emit("vanilla-texture-progress", (current, total)) {
            eprintln!(
                "[initialize_vanilla_textures] Failed to emit progress event: {}",
                e
            );
        }
    });

    vanilla_textures::initialize_vanilla_textures_with_progress(Some(progress_callback))
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| AppError::io(format!("Failed to initialize vanilla textures: {}", e)))
}

/// Get the path to a vanilla texture file
///
/// # Arguments
/// * `asset_id` - Asset ID like "minecraft:block/stone"
///
/// # Returns
/// Absolute path to the texture PNG file
pub fn get_vanilla_texture_path_impl(asset_id: String) -> Result<String, AppError> {
    vanilla_textures::get_vanilla_texture_path(&asset_id)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| AppError::io(format!("Vanilla texture not found: {}", e)))
}

/// Get the path to a vanilla texture's .mcmeta file (if it exists)
///
/// # Arguments
/// * `asset_id` - Asset ID like "minecraft:block/magma"
///
/// # Returns
/// Absolute path to the .mcmeta file, or None if it doesn't exist
pub fn get_vanilla_mcmeta_path_impl(asset_id: String) -> Result<Option<String>, AppError> {
    vanilla_textures::get_vanilla_mcmeta_path(&asset_id)
        .map(|opt| opt.map(|p| p.to_string_lossy().to_string()))
        .map_err(|e| AppError::io(format!("Failed to check for .mcmeta file: {}", e)))
}

/// Get the path to a biome colormap file (grass or foliage)
///
/// # Arguments
/// * `colormap_type` - Type of colormap: "grass" or "foliage"
///
/// # Returns
/// Absolute path to the colormap PNG file
pub fn get_colormap_path_impl(colormap_type: String) -> Result<String, AppError> {
    vanilla_textures::get_colormap_path(&colormap_type)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| AppError::io(format!("Colormap not found: {}", e)))
}

/// List all available Minecraft versions
///
/// # Returns
/// Array of MinecraftVersion objects with version info
pub fn list_available_minecraft_versions_impl(
) -> Result<Vec<vanilla_textures::MinecraftVersion>, AppError> {
    vanilla_textures::list_all_available_versions()
        .map_err(|e| AppError::io(format!("Failed to list Minecraft versions: {}", e)))
}

/// Get the currently cached vanilla texture version
///
/// # Returns
/// Version string if cached, null if no cache exists
pub fn get_cached_vanilla_version_impl() -> Result<Option<String>, AppError> {
    vanilla_textures::get_cached_version()
        .map_err(|e| AppError::io(format!("Failed to get cached version: {}", e)))
}

/// Extract vanilla textures for a specific Minecraft version
///
/// # Arguments
/// * `version` - Version identifier (e.g., "1.21.4")
/// * `window` - Tauri window handle for emitting progress events
///
/// # Returns
/// Path to the vanilla textures cache directory
pub fn set_vanilla_texture_version_impl(
    version: String,
    window: tauri::Window,
) -> Result<String, AppError> {
    use std::sync::Arc;
    use tauri::Emitter;

    // Create progress callback that emits events to the frontend
    let progress_callback = Arc::new(move |current: usize, total: usize| {
        println!(
            "[set_vanilla_texture_version] Emitting progress: {}/{}",
            current, total
        );
        if let Err(e) = window.emit("vanilla-texture-progress", (current, total)) {
            eprintln!(
                "[set_vanilla_texture_version] Failed to emit progress event: {}",
                e
            );
        }
    });

    vanilla_textures::extract_vanilla_textures_for_version_with_progress(
        &version,
        Some(progress_callback),
    )
    .map(|p| p.to_string_lossy().to_string())
    .map_err(|e| {
        AppError::io(format!(
            "Failed to extract vanilla textures for version {}: {}",
            version, e
        ))
    })
}

/// Check if Minecraft is installed
///
/// # Returns
/// true if Minecraft installation found, false otherwise
pub fn check_minecraft_installed_impl() -> Result<bool, AppError> {
    match mc_paths::get_default_minecraft_dir() {
        Ok(mc_dir) => Ok(vanilla_textures::check_minecraft_installation(&mc_dir).unwrap_or(false)),
        Err(_) => Ok(false),
    }
}

/// Get suggested Minecraft installation paths
///
/// # Returns
/// List of likely paths where Minecraft might be installed
pub fn get_suggested_minecraft_paths_impl() -> Result<Vec<String>, AppError> {
    Ok(vanilla_textures::get_suggested_minecraft_paths())
}

/// Initialize vanilla textures from a custom Minecraft directory
///
/// # Arguments
/// * `minecraft_dir` - Path to the .minecraft directory
///
/// # Returns
/// Path to the vanilla textures cache directory
pub fn initialize_vanilla_textures_from_custom_dir_impl(
    minecraft_dir: String,
) -> Result<String, AppError> {
    let path = PathBuf::from(minecraft_dir);

    vanilla_textures::initialize_vanilla_textures_from_dir(&path)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| AppError::io(format!("Failed to initialize vanilla textures: {}", e)))
}

/// Detect all Minecraft launchers on the system
///
/// # Returns
/// List of detected launchers with their paths
pub fn detect_launchers_impl() -> Result<Vec<launcher_detection::LauncherInfo>, AppError> {
    Ok(launcher_detection::detect_all_launchers())
}

/// Identify launcher type from a directory path
///
/// # Arguments
/// * `path` - Directory path to identify
///
/// # Returns
/// Launcher information if valid Minecraft directory
pub fn identify_launcher_impl(path: String) -> Result<launcher_detection::LauncherInfo, AppError> {
    let path_buf = PathBuf::from(&path);

    // Validate it's a Minecraft directory
    if !launcher_detection::validate_minecraft_directory(&path_buf).unwrap_or(false) {
        return Err(AppError::validation("Not a valid Minecraft directory. Please select a folder containing 'versions', 'instances', or 'profiles'."));
    }

    // Identify launcher type
    let launcher_type = launcher_detection::identify_launcher_from_path(&path_buf)
        .map_err(|e| AppError::io(format!("Failed to identify launcher: {}", e)))?;

    Ok(launcher_detection::LauncherInfo {
        launcher_type: launcher_type.clone(),
        name: launcher_type.display_name().to_string(),
        minecraft_dir: path,
        found: true,
        icon: launcher_type.icon().to_string(),
        icon_path: launcher_detection::get_launcher_icon_path(&launcher_type),
    })
}

/// Get resourcepacks directory for a launcher
///
/// # Arguments
/// * `launcher_info` - Launcher information with path and type
///
/// # Returns
/// Path to the resourcepacks directory
pub fn get_launcher_resourcepacks_dir_impl(
    launcher_info: launcher_detection::LauncherInfo,
) -> Result<String, AppError> {
    let launcher_dir = PathBuf::from(&launcher_info.minecraft_dir);

    let resourcepacks_dir =
        launcher_detection::get_resourcepacks_dir(&launcher_dir, &launcher_info.launcher_type)
            .map_err(|e| AppError::io(format!("Failed to get resourcepacks directory: {}", e)))?;

    Ok(resourcepacks_dir.to_string_lossy().to_string())
}

/// Get the full path to a texture file from a resource pack
///
/// # Arguments
/// * `pack_path` - Base path to the resource pack (from PackMeta.path)
/// * `asset_id` - Asset ID (e.g., "minecraft:block/stone")
/// * `is_zip` - Whether the pack is a ZIP file
///
/// # Returns
/// Full path to the texture file
pub fn get_pack_texture_path_impl(
    pack_path: String,
    asset_id: String,
    is_zip: bool,
    version_folders: Option<Vec<String>>,
    app_handle: &tauri::AppHandle,
) -> Result<String, AppError> {
    // Parse asset ID: "minecraft:block/stone" -> "assets/minecraft/textures/block/stone.png"
    let texture_path = asset_id.strip_prefix("minecraft:").unwrap_or(&asset_id);
    let relative_path = format!("assets/minecraft/textures/{}.png", texture_path);

    let mut candidate_paths: Vec<String> = Vec::new();
    candidate_paths.push(relative_path.clone());
    if let Some(folders) = &version_folders {
        for folder in folders {
            let trimmed = folder.trim().trim_matches('/');
            if trimmed.is_empty() {
                continue;
            }
            candidate_paths.push(format!("{}/{}", trimmed, relative_path));
        }
    }

    if is_zip {
        // For ZIP files, extract to temporary cache directory
        let zip_path_str = &pack_path;

        // Extract the texture bytes from ZIP (try version-folder candidates too).
        let mut chosen_rel: Option<String> = None;
        let mut bytes: Option<Vec<u8>> = None;
        for cand in &candidate_paths {
            match crate::util::zip::extract_zip_entry(zip_path_str, cand) {
                Ok(b) => {
                    chosen_rel = Some(cand.clone());
                    bytes = Some(b);
                    break;
                }
                Err(_) => continue,
            }
        }
        let bytes = bytes.ok_or_else(|| {
            AppError::validation(format!("Texture not found in ZIP: {}", relative_path))
        })?;
        let chosen_rel = chosen_rel.unwrap_or(relative_path.clone());

        // Create a cache directory for this ZIP using Tauri's cache directory
        use tauri::Manager;
        let cache_dir = app_handle
            .path()
            .cache_dir()
            .map_err(|e| AppError::io(format!("Failed to get cache dir: {}", e)))?
            .join("weaverbird_textures");

        std::fs::create_dir_all(&cache_dir)
            .map_err(|e| AppError::io(format!("Failed to create cache dir: {}", e)))?;

        // Create a unique filename based on the ZIP path and texture path
        let zip_path_buf = PathBuf::from(&pack_path);
        let zip_name = zip_path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        // Sanitize the chosen relative path for filesystem
        let safe_texture_path = chosen_rel.replace("/", "_").replace("\\", "_");
        let cache_file = cache_dir.join(format!("{}_{}", zip_name, safe_texture_path));

        // Write the texture to cache if it doesn't exist
        if !cache_file.exists() {
            std::fs::write(&cache_file, &bytes)
                .map_err(|e| AppError::io(format!("Failed to write cached texture: {}", e)))?;
        }

        Ok(cache_file.to_string_lossy().to_string())
    } else {
        // For directory packs, just combine the paths
        let pack_base = PathBuf::from(&pack_path);
        for cand in &candidate_paths {
            let full_path = pack_base.join(cand);
            if full_path.exists() {
                return Ok(full_path.to_string_lossy().to_string());
            }
        }

        Err(AppError::validation(format!(
            "Texture not found in pack: {}",
            relative_path
        )))
    }
}

/// Load a model JSON directly by model ID (after blockstate resolution)
///
/// This is a simpler version that just loads the model JSON without going through
/// blockstate resolution. Use this after you've already resolved a blockstate to a model ID.
///
/// # Arguments
/// * `pack_id` - ID of the resource pack to read from
/// * `model_id` - Model ID (e.g., "minecraft:block/acacia_log_horizontal" or "block/dirt")
/// * `packs_dir` - Directory containing resource packs
///
/// # Returns
/// BlockModel JSON with parent inheritance applied
pub fn load_model_json_impl(
    pack_id: String,
    model_id: String,
    packs_dir: String,
) -> Result<crate::util::block_models::BlockModel, AppError> {
    // Validate inputs
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Create vanilla pack
    let vanilla_pack = create_vanilla_pack()?;

    // Get target pack
    let target_pack = if pack_id == "minecraft:vanilla" {
        vanilla_pack.clone()
    } else {
        let packs = pack_scanner::scan_packs(&packs_dir)
            .map_err(|e| AppError::scan(format!("Failed to scan packs: {}", e)))?;
        packs
            .iter()
            .find(|p| p.id == pack_id)
            .ok_or_else(|| AppError::validation(format!("Pack not found: {}", pack_id)))?
            .clone()
    };

    // Load model with parent inheritance and vanilla fallback
    crate::util::block_models::resolve_block_model(&target_pack, &model_id, &vanilla_pack)
        .map_err(|e| AppError::io(format!("Failed to load model: {}", e)))
}

/// Read a Minecraft block model JSON file from texture ID
///
/// This properly resolves the chain: texture ID -> blockstate -> model
///
/// # Arguments
/// * `pack_id` - ID of the resource pack to read from
/// * `texture_id` - Texture/asset ID (e.g., "minecraft:block/dirt")
/// * `packs_dir` - Directory containing resource packs
///
/// # Returns
/// Fully resolved BlockModel JSON with parent inheritance applied
pub fn read_block_model_impl(
    pack_id: String,
    texture_id: String,
    packs_dir: String,
) -> Result<crate::util::block_models::BlockModel, AppError> {
    // Validate inputs
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Create vanilla pack first
    let vanilla_pack = create_vanilla_pack()?;

    // If requesting vanilla directly, use it
    let target_pack = if pack_id == "minecraft:vanilla" {
        vanilla_pack.clone()
    } else {
        // Scan packs to find the requested pack
        let packs = pack_scanner::scan_packs(&packs_dir)
            .map_err(|e| AppError::scan(format!("Failed to scan packs: {}", e)))?;

        // Find the target pack
        packs
            .iter()
            .find(|p| p.id == pack_id)
            .ok_or_else(|| AppError::validation(format!("Pack not found: {}", pack_id)))?
            .clone()
    };

    // Try to build texture index for accurate lookup
    let texture_index = texture_index::TextureIndex::build(&target_pack, &vanilla_pack)
        .unwrap_or_else(|_e| {
            texture_index::TextureIndex {
                texture_to_blocks: HashMap::new(),
            }
        });

    // Extract texture path from texture ID
    // "minecraft:block/acacia_log" -> "block/acacia_log"
    let texture_path = texture_id.strip_prefix("minecraft:").unwrap_or(&texture_id);

    // Try to look up block ID from texture index first
    let block_id = if let Some(primary_block) = texture_index.get_primary_block(texture_path) {
        primary_block.to_string()
    } else {
        // Fall back to heuristic method
        crate::util::blockstates::texture_id_to_block_id(&texture_id)
            .ok_or_else(|| AppError::validation(format!("Not a block texture: {}", texture_id)))?
    };

    // Generate alternative block IDs to try (common naming variations)
    let mut block_id_candidates = vec![block_id.clone()];

    // Try with underscores inserted before common suffixes
    // e.g., "acaciabutton" -> "acacia_button"
    let suffixes_to_try = [
        "button",
        "slab",
        "stairs",
        "fence",
        "wall",
        "door",
        "trapdoor",
        "sign",
        "pressure_plate",
    ];
    for suffix in &suffixes_to_try {
        if block_id.ends_with(suffix) && !block_id.contains('_') {
            let prefix = block_id.strip_suffix(suffix).unwrap();
            let with_underscore = format!("{}_{}", prefix, suffix);
            if !block_id_candidates.contains(&with_underscore) {
                block_id_candidates.push(with_underscore);
            }
        }
    }

    // Try to read blockstate from target pack, fall back to vanilla
    // Try all candidate block IDs until one works
    let (blockstate, _used_block_id) = {
        let mut found_blockstate = None;
        let mut found_block_id = block_id.clone();

        for candidate in &block_id_candidates {
            match crate::util::blockstates::read_blockstate(
                &PathBuf::from(&target_pack.path),
                candidate,
                target_pack.is_zip,
            ) {
                Ok(bs) => {
                    found_blockstate = Some(bs);
                    found_block_id = candidate.clone();
                    break;
                }
                Err(_) => {
                }
            }
        }

        if let Some(bs) = found_blockstate {
            (bs, found_block_id)
        } else {
            // Try vanilla blockstate with all candidates
            let mut found_vanilla = None;
            for candidate in &block_id_candidates {
                match crate::util::blockstates::read_blockstate(
                    &PathBuf::from(&vanilla_pack.path),
                    candidate,
                    vanilla_pack.is_zip,
                ) {
                    Ok(bs) => {
                        found_vanilla = Some((bs, candidate.clone()));
                        break;
                    }
                    Err(_) => {
                    }
                }
            }

            found_vanilla.ok_or_else(|| {
                AppError::validation(format!(
                    "Blockstate not found for any of: {:?}",
                    block_id_candidates
                ))
            })?
        }
    };

    // Get the default model from the blockstate
    let model_id = crate::util::blockstates::get_default_model(&blockstate).ok_or_else(|| {
        AppError::validation(format!(
            "No default model found in blockstate for {}",
            block_id
        ))
    })?;

    // Resolve the model with parent inheritance
    let result =
        crate::util::block_models::resolve_block_model(&target_pack, &model_id, &vanilla_pack)
            .map_err(|e| AppError::io(format!("Failed to read block model: {}", e)));

    result
}

/// Get the blockstate schema for a block (for UI generation)
///
/// # Arguments
/// * `pack_id` - Pack ID to search
/// * `block_id` - Block name (e.g., "oak_stairs")
/// * `packs_dir` - Root directory containing packs
///
/// # Errors
/// - VALIDATION_ERROR: Invalid inputs or block not found
///
/// # Returns
/// BlockStateSchema with properties for UI generation
pub fn get_block_state_schema_impl(
    pack_id: String,
    block_id: String,
    packs_dir: String,
) -> Result<crate::util::blockstates::BlockStateSchema, AppError> {
    // Normalize block_id to strip texture path prefixes
    let normalized_block_id = if let Some(stripped) = block_id.strip_prefix("minecraft:block/") {
        stripped.to_string()
    } else if let Some(stripped) = block_id.strip_prefix("block/") {
        stripped.to_string()
    } else if let Some(stripped) = block_id.strip_prefix("minecraft:") {
        stripped.to_string()
    } else {
        block_id.clone()
    };

    // Validate inputs
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Create vanilla pack
    let vanilla_pack = create_vanilla_pack()?;

    // Get target pack
    let target_pack = if pack_id == "minecraft:vanilla" {
        vanilla_pack.clone()
    } else {
        let packs = pack_scanner::scan_packs(&packs_dir)
            .map_err(|e| AppError::scan(format!("Failed to scan packs: {}", e)))?;
        packs
            .iter()
            .find(|p| p.id == pack_id)
            .ok_or_else(|| AppError::validation(format!("Pack not found: {}", pack_id)))?
            .clone()
    };

    // Use universal blockstate finder to locate the file
    let (blockstate, used_block_id) = {
        // Try target pack first
        if let Some(actual_block_id) = crate::util::blockstates::find_blockstate_file(
            &PathBuf::from(&target_pack.path),
            &normalized_block_id,
            target_pack.is_zip,
        ) {
            let bs = crate::util::blockstates::read_blockstate(
                &PathBuf::from(&target_pack.path),
                &actual_block_id,
                target_pack.is_zip,
            )?;
            (bs, actual_block_id)
        }
        // Fallback to vanilla
        else if let Some(actual_block_id) = crate::util::blockstates::find_blockstate_file(
            &PathBuf::from(&vanilla_pack.path),
            &normalized_block_id,
            vanilla_pack.is_zip,
        ) {
            let bs = crate::util::blockstates::read_blockstate(
                &PathBuf::from(&vanilla_pack.path),
                &actual_block_id,
                vanilla_pack.is_zip,
            )?;
            (bs, actual_block_id)
        } else {
            return Err(AppError::validation(format!(
                "Blockstate not found: {}",
                normalized_block_id
            )));
        }
    };

    // Build schema
    let schema = crate::util::blockstates::build_block_state_schema(&blockstate, &used_block_id);

    Ok(schema)
}

/// Resolve a blockstate to a list of models with transformations
///
/// # Arguments
/// * `pack_id` - Pack ID to search
/// * `block_id` - Block name (e.g., "oak_stairs")
/// * `packs_dir` - Root directory containing packs
/// * `state_props` - Block state properties (e.g., {"facing": "north", "half": "bottom"})
/// * `seed` - Random seed for weighted variant selection
///
/// # Errors
/// - VALIDATION_ERROR: Invalid inputs or resolution failed
///
/// # Returns
/// ResolutionResult with resolved models and their rotations
pub fn resolve_block_state_impl(
    pack_id: String,
    block_id: String,
    packs_dir: String,
    state_props: Option<HashMap<String, String>>,
    seed: Option<u64>,
) -> Result<crate::util::blockstates::ResolutionResult, AppError> {
    // CRITICAL: Normalize block_id to strip texture path prefixes
    // Input might be "minecraft:block/dark_oak_planks" but we need just "dark_oak_planks"
    let normalized_block_id = if let Some(stripped) = block_id.strip_prefix("minecraft:block/") {
        stripped.to_string()
    } else if let Some(stripped) = block_id.strip_prefix("block/") {
        stripped.to_string()
    } else if let Some(stripped) = block_id.strip_prefix("minecraft:") {
        stripped.to_string()
    } else {
        block_id.clone()
    };

    // Validate inputs
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Create vanilla pack
    let vanilla_pack = create_vanilla_pack()?;

    // Get target pack
    let target_pack = if pack_id == "minecraft:vanilla" {
        vanilla_pack.clone()
    } else {
        let packs = pack_scanner::scan_packs(&packs_dir)
            .map_err(|e| AppError::scan(format!("Failed to scan packs: {}", e)))?;
        packs
            .iter()
            .find(|p| p.id == pack_id)
            .ok_or_else(|| AppError::validation(format!("Pack not found: {}", pack_id)))?
            .clone()
    };

    // Use universal blockstate finder to locate the file
    // This scans the directory and matches by normalizing names (removing underscores)
    // Works with any block type without needing a hardcoded list
    let (blockstate, used_block_id) = {
        // Try target pack first
        if let Some(actual_block_id) = crate::util::blockstates::find_blockstate_file(
            &PathBuf::from(&target_pack.path),
            &normalized_block_id,
            target_pack.is_zip,
        ) {
            let bs = crate::util::blockstates::read_blockstate(
                &PathBuf::from(&target_pack.path),
                &actual_block_id,
                target_pack.is_zip,
            )?;
            (bs, actual_block_id)
        }
        // Fallback to vanilla
        else if let Some(actual_block_id) = crate::util::blockstates::find_blockstate_file(
            &PathBuf::from(&vanilla_pack.path),
            &normalized_block_id,
            vanilla_pack.is_zip,
        ) {
            let bs = crate::util::blockstates::read_blockstate(
                &PathBuf::from(&vanilla_pack.path),
                &actual_block_id,
                vanilla_pack.is_zip,
            )?;
            (bs, actual_block_id)
        } else {
            return Err(AppError::validation(format!(
                "Blockstate not found: {}",
                normalized_block_id
            )));
        }
    };

    // Build schema to get valid properties for this block
    let schema = crate::util::blockstates::build_block_state_schema(&blockstate, &used_block_id);

    // Get the set of valid property names for this block
    let valid_props: std::collections::HashSet<String> =
        schema.properties.iter().map(|p| p.name.clone()).collect();

    // CRITICAL: Merge provided state props with defaults, but ONLY include properties
    // that are actually defined in the blockstate schema. This filters out invalid
    // properties like "hinge" for trapdoors or "distance" for barrels.
    let final_props = match state_props {
        Some(map) if !map.is_empty() => {
            let mut merged = schema.default_state.clone();
            for (key, value) in map {
                if valid_props.contains(&key) {
                    merged.insert(key, value);
                }
            }
            Some(merged)
        }
        _ => Some(schema.default_state.clone()),
    };

    // Resolve blockstate
    crate::util::blockstates::resolve_blockstate(
        &blockstate,
        &used_block_id,
        final_props,
        seed,
    )
}

/// Read a file from a resource pack (directory or ZIP)
///
/// Generic file reading command for loading any file from a pack.
/// Supports both directory-based packs and ZIP packs.
///
/// # Arguments
/// * `pack_path` - Path to the pack (directory or ZIP file), or "." for project root
/// * `file_path` - Relative path to file within the pack (e.g., "assets/minecraft/optifine/cem/chest.jem")
/// * `is_zip` - Whether the pack is a ZIP file
///
/// # Returns
/// File contents as a string
pub fn read_pack_file_impl(
    pack_path: String,
    file_path: String,
    is_zip: bool,
) -> Result<String, AppError> {
    use std::fs;
    use std::path::Path;

    println!(
        "[read_pack_file] pack_path: {}, file_path: {}, is_zip: {}",
        pack_path, file_path, is_zip
    );

    if is_zip {
        // Read from ZIP file
        let zip_file = fs::File::open(&pack_path)
            .map_err(|e| AppError::io(format!("Failed to open ZIP: {}", e)))?;

        let mut archive = zip::ZipArchive::new(zip_file)
            .map_err(|e| AppError::io(format!("Failed to read ZIP: {}", e)))?;

        let mut file = archive
            .by_name(&file_path)
            .map_err(|e| AppError::io(format!("File not found in ZIP: {}", e)))?;

        let mut contents = String::new();
        std::io::Read::read_to_string(&mut file, &mut contents)
            .map_err(|e| AppError::io(format!("Failed to read file from ZIP: {}", e)))?;

        Ok(contents)
    } else {
        // Read from directory
        let full_path = if pack_path == "." {
            // Special case: read from project root (for __mocks__/cem/)
            PathBuf::from(&file_path)
        } else {
            Path::new(&pack_path).join(&file_path)
        };

        println!("[read_pack_file] Reading from: {}", full_path.display());

        fs::read_to_string(&full_path)
            .map_err(|e| AppError::io(format!("Failed to read file: {}", e)))
    }
}

/// Read a vanilla JEM file from __mocks__/cem/ directory
///
/// # Arguments
/// * `entity_type` - Entity type (e.g., "cow", "pig", "chest")
///
/// # Returns
/// JEM file contents as a string
pub fn read_vanilla_jem_impl(entity_type: String) -> Result<String, AppError> {
    use std::fs;
    use std::path::PathBuf;

    // Use the manifest directory as the base (src-tauri's parent directory)
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let base_path = PathBuf::from(manifest_dir);
    let project_root = base_path
        .parent()
        .ok_or_else(|| AppError::io("Could not determine project root".to_string()))?;

    // Construct path to vanilla JEM file relative to project root
    let jem_path = project_root
        .join("__mocks__")
        .join("cem")
        .join(format!("{}.jem", entity_type));

    println!(
        "[read_vanilla_jem] Reading vanilla JEM from: {}",
        jem_path.display()
    );

    fs::read_to_string(&jem_path).map_err(|e| {
        AppError::io(format!(
            "Failed to read vanilla JEM at {}: {}",
            jem_path.display(),
            e
        ))
    })
}

/// Get all entities that have version variants in JEM files
/// Returns a map of entity ID -> list of version folders
///
/// # Errors
/// - VALIDATION_ERROR: Directory doesn't exist or is invalid
/// - SCAN_ERROR: Failed to scan packs for version variants
pub fn get_entity_version_variants_impl(
    packs_dir: String,
) -> Result<HashMap<String, Vec<String>>, AppError> {
    // Validate input
    validation::validate_directory(&packs_dir, "Packs directory")?;

    // Scan for packs
    let packs = pack_scanner::scan_packs(&packs_dir).map_err(|e| AppError::scan(e.to_string()))?;

    // Scan for version variants
    let variants = asset_indexer::scan_entity_version_variants(&packs)
        .map_err(|e| AppError::scan(format!("Failed to scan entity version variants: {}", e)))?;

    Ok(variants)
}

/// Get particle texture mappings for the currently cached Minecraft version
pub fn get_particle_data_impl() -> Result<Option<particle_data::ParticleData>, AppError> {
    particle_data::get_particle_data()
        .map(Some)
        .or_else(|e| {
            // Return None instead of error if data doesn't exist yet
            eprintln!("Particle data not available: {}", e);
            Ok(None)
        })
}

/// Get particle texture mappings for a specific Minecraft version
pub fn get_particle_data_for_version_impl(
    version: String,
) -> Result<particle_data::ParticleData, AppError> {
    particle_data::get_particle_data_for_version(&version)
        .map_err(|e| AppError::io(format!("Failed to get particle data for {}: {}", version, e)))
}

/// Get cached particle physics data for the current Minecraft version
///
/// Returns physics data if already cached, otherwise returns None.
/// Use `extract_particle_physics` to extract and cache physics data.
///
/// # Returns
/// Optional ExtractedPhysicsData if cached
pub fn get_particle_physics_impl(
) -> Result<Option<crate::util::particle_physics_extractor::ExtractedPhysicsData>, AppError> {
    // Get the currently cached vanilla version
    let version = match vanilla_textures::get_cached_version() {
        Ok(Some(v)) => v,
        Ok(None) => return Ok(None),
        Err(e) => return Err(AppError::io(format!("Failed to get cached version: {}", e))),
    };

    crate::util::particle_physics_extractor::load_cached_physics_data(&version)
        .map_err(|e| AppError::io(format!("Failed to load cached physics: {}", e)))
}

/// Check if particle physics data is cached for a version
///
/// # Arguments
/// * `version` - Minecraft version string
///
/// # Returns
/// true if physics data is cached
pub fn is_particle_physics_cached_impl(version: String) -> Result<bool, AppError> {
    crate::util::particle_physics_extractor::is_physics_data_cached(&version)
        .map_err(|e| AppError::io(format!("Failed to check physics cache: {}", e)))
}

/// Extract particle physics from Minecraft source code (async, expensive)
///
/// Downloads Mojang mappings, sets up CFR decompiler, and extracts physics
/// values from decompiled particle classes. Results are cached per-version.
///
/// This is an expensive operation - call sparingly and show a loading indicator.
///
/// # Arguments
/// * `version` - Minecraft version string (e.g., "1.21.4")
///
/// # Returns
/// ExtractedPhysicsData with particle physics values
pub async fn extract_particle_physics_impl(
    version: String,
) -> Result<crate::util::particle_physics_extractor::ExtractedPhysicsData, AppError> {
    // Get the JAR path for this version
    let versions = vanilla_textures::list_all_available_versions()
        .map_err(|e| AppError::io(format!("Failed to list versions: {}", e)))?;

    let version_info = versions
        .iter()
        .find(|v| v.version == version)
        .ok_or_else(|| AppError::validation(format!("Version not found: {}", version)))?;

    let jar_path = std::path::PathBuf::from(&version_info.jar_path);

    crate::util::particle_physics_extractor::extract_particle_physics(&jar_path, &version)
        .await
        .map_err(|e| AppError::io(format!("Failed to extract particle physics: {}", e)))
}

// ============================================================================
// BLOCK PARTICLE EMISSIONS
// ============================================================================

/// Get cached block particle emissions for the current Minecraft version
///
/// Returns emissions data if already cached, otherwise returns None.
/// Use `extract_block_emissions` to extract and cache emissions data.
///
/// # Returns
/// Optional ExtractedBlockEmissions if cached
pub fn get_block_emissions_impl(
) -> Result<Option<crate::util::block_particle_extractor::ExtractedBlockEmissions>, AppError> {
    // Get the currently cached vanilla version
    let version = match vanilla_textures::get_cached_version() {
        Ok(Some(v)) => v,
        Ok(None) => return Ok(None),
        Err(e) => return Err(AppError::io(format!("Failed to get cached version: {}", e))),
    };

    crate::util::block_particle_extractor::load_cached_block_emissions(&version)
        .map_err(|e| AppError::io(format!("Failed to load cached emissions: {}", e)))
}

/// Check if block emissions data is cached for a version
///
/// # Arguments
/// * `version` - Minecraft version string
///
/// # Returns
/// true if emissions data is cached
pub fn is_block_emissions_cached_impl(version: String) -> Result<bool, AppError> {
    crate::util::block_particle_extractor::is_block_emissions_cached(&version)
        .map_err(|e| AppError::io(format!("Failed to check emissions cache: {}", e)))
}

/// Extract block particle emissions from Minecraft source code (async, expensive)
///
/// Downloads Mojang mappings, sets up CFR decompiler, and extracts particle
/// emissions from decompiled block classes. Results are cached per-version.
///
/// This is an expensive operation - call sparingly and show a loading indicator.
///
/// # Arguments
/// * `version` - Minecraft version string (e.g., "1.21.4")
///
/// # Returns
/// ExtractedBlockEmissions with block -> particle mappings
pub async fn extract_block_emissions_impl(
    version: String,
) -> Result<crate::util::block_particle_extractor::ExtractedBlockEmissions, AppError> {
    // Get the JAR path for this version
    let versions = vanilla_textures::list_all_available_versions()
        .map_err(|e| AppError::io(format!("Failed to list versions: {}", e)))?;

    let version_info = versions
        .iter()
        .find(|v| v.version == version)
        .ok_or_else(|| AppError::validation(format!("Version not found: {}", version)))?;

    let jar_path = std::path::PathBuf::from(&version_info.jar_path);

    crate::util::block_particle_extractor::extract_block_emissions(&jar_path, &version)
        .await
        .map_err(|e| AppError::io(format!("Failed to extract block emissions: {}", e)))
}

/// Generate TypeScript particle data file from cached extractions
///
/// This reads the cached particle physics and block emissions data and generates
/// a TypeScript file that the frontend can import directly.
///
/// # Returns
/// Success message if generation succeeded
pub fn generate_particle_typescript_impl() -> Result<String, AppError> {
    // Load cached data
    let physics = get_particle_physics_impl()?
        .ok_or_else(|| AppError::validation("No cached particle physics data found. Extract physics first.".to_string()))?;

    let emissions = get_block_emissions_impl()?
        .ok_or_else(|| AppError::validation("No cached block emissions data found. Extract emissions first.".to_string()))?;

    // Determine output path - go up from src-tauri to project root
    let src_tauri_dir = std::env::current_dir()
        .map_err(|e| AppError::io(format!("Failed to get current dir: {}", e)))?;
    let project_root = src_tauri_dir.parent()
        .ok_or_else(|| AppError::io("No parent directory found".to_string()))?;
    let ts_output = project_root.join("src/constants/particles/generated.ts");

    // Generate the TypeScript file
    crate::util::particle_typescript_gen::generate_particle_data_typescript(
        &physics,
        &emissions,
        &ts_output,
    )
    .map_err(|e| AppError::io(format!("Failed to generate TypeScript: {}", e)))?;

    Ok(format!(
        "Generated particle data for {} at {:?}",
        physics.version, ts_output
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_packs_dir() {
        let result = get_default_packs_dir_impl();
        assert!(result.is_ok());
    }
}
