/// Utility for reading and resolving Minecraft blockstate files
///
/// Blockstates are the entry point for block rendering. They map block states
/// to specific models, which may have variants or multipart definitions.
use crate::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// A blockstate file structure
///
/// Example: assets/minecraft/blockstates/dirt.json
/// Can have either "variants" or "multipart" (or both in newer versions)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blockstate {
    /// Variant-based blockstates (most common)
    /// Maps state combinations to models
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<HashMap<String, BlockstateVariant>>,

    /// Multipart blockstates (for complex blocks like fences)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multipart: Option<Vec<MultipartCase>>,
}

/// A variant can be a single model or an array of weighted options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum BlockstateVariant {
    Single(ModelReference),
    Multiple(Vec<ModelReference>),
}

/// Reference to a model with optional transformations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelReference {
    /// Model path (e.g., "minecraft:block/dirt")
    pub model: String,

    /// X-axis rotation (0, 90, 180, 270)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<i32>,

    /// Y-axis rotation (0, 90, 180, 270)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<i32>,

    /// Z-axis rotation (0, 90, 180, 270) - modern format
    #[serde(skip_serializing_if = "Option::is_none")]
    pub z: Option<i32>,

    /// UV lock for rotations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uvlock: Option<bool>,

    /// Weight for random selection
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<i32>,
}

/// A multipart case with conditional model application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultipartCase {
    /// Condition for this part to be applied
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<serde_json::Value>,

    /// Model(s) to apply if condition matches
    pub apply: BlockstateVariant,
}

/// Read a blockstate file from a resource pack
///
/// # Arguments
/// * `pack_path` - Path to the resource pack
/// * `block_id` - Block ID without "minecraft:" prefix (e.g., "dirt", "stone")
/// * `is_zip` - Whether the pack is a ZIP file
///
/// # Returns
/// The parsed Blockstate structure
pub fn read_blockstate(pack_path: &Path, block_id: &str, is_zip: bool) -> AppResult<Blockstate> {
    println!("=== [read_blockstate] START ===");
    println!("[read_blockstate] pack_path: {:?}", pack_path);
    println!("[read_blockstate] block_id: {}", block_id);
    println!("[read_blockstate] is_zip: {}", is_zip);

    // Blockstates are at: assets/minecraft/blockstates/{block_id}.json
    let relative_path = format!("assets/minecraft/blockstates/{}.json", block_id);
    println!(
        "[read_blockstate] Constructed relative_path: {}",
        relative_path
    );

    let contents = if is_zip {
        // Read from ZIP archive
        let zip_path_str = pack_path
            .to_str()
            .ok_or_else(|| AppError::validation("Invalid pack path"))?;

        let bytes = crate::util::zip::extract_zip_entry(zip_path_str, &relative_path)
            .map_err(|e| AppError::validation(format!("Blockstate not found in ZIP: {}", e)))?;

        String::from_utf8(bytes)
            .map_err(|e| AppError::validation(format!("Invalid UTF-8 in blockstate: {}", e)))?
    } else {
        // Read from directory
        let full_path = pack_path.join(&relative_path);

        if !full_path.exists() {
            return Err(AppError::validation(format!(
                "Blockstate not found: {}",
                relative_path
            )));
        }

        fs::read_to_string(&full_path)
            .map_err(|e| AppError::io(format!("Failed to read blockstate file: {}", e)))?
    };

    let blockstate: Blockstate = serde_json::from_str(&contents)
        .map_err(|e| AppError::validation(format!("Invalid blockstate JSON: {}", e)))?;

    Ok(blockstate)
}

/// Get the default model for a block (from the "" or "normal" variant)
///
/// Most blocks have a default state represented by an empty string key
/// For multipart blocks (fences, walls, etc.), returns the first unconditional part
pub fn get_default_model(blockstate: &Blockstate) -> Option<String> {
    if let Some(variants) = &blockstate.variants {
        // Try empty string first (most common)
        if let Some(variant) = variants.get("") {
            return extract_first_model(variant);
        }

        // Try "normal" as fallback (older format)
        if let Some(variant) = variants.get("normal") {
            return extract_first_model(variant);
        }

        // If neither exists, just return the first variant
        if let Some((_, variant)) = variants.iter().next() {
            return extract_first_model(variant);
        }
    }

    // For multipart blocks (fences, walls, glass panes, etc.)
    // Return the first part without conditions, or the first part overall
    if let Some(multipart) = &blockstate.multipart {
        // First try to find an unconditional part (no "when" clause)
        for part in multipart {
            if part.when.is_none() {
                return extract_first_model(&part.apply);
            }
        }

        // If all parts are conditional, just return the first one
        if let Some(first_part) = multipart.first() {
            return extract_first_model(&first_part.apply);
        }
    }

    None
}

/// Extract the first model reference from a variant
fn extract_first_model(variant: &BlockstateVariant) -> Option<String> {
    match variant {
        BlockstateVariant::Single(model_ref) => Some(model_ref.model.clone()),
        BlockstateVariant::Multiple(models) => models.first().map(|m| m.model.clone()),
    }
}

// ============================================================================
// Block State Schema and Resolution (for UI and rendering)
// ============================================================================

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use std::collections::HashSet;

/// Schema for a block property (for UI generation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockPropertySchema {
    pub name: String,
    #[serde(rename = "type")]
    pub property_type: String, // "enum" | "boolean" | "int"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<i32>,
    pub default: String,
}

/// Complete schema for a block's state (for UI)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockStateSchema {
    #[serde(rename = "blockId")]
    pub block_id: String,
    pub properties: Vec<BlockPropertySchema>,
    #[serde(rename = "defaultState")]
    pub default_state: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "variantsMap")]
    pub variants_map: Option<HashMap<String, usize>>, // variant key -> model count
}

/// A resolved model with all transformations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedModel {
    #[serde(rename = "modelId")]
    pub model_id: String,
    #[serde(rename = "rotX")]
    pub rot_x: i32,
    #[serde(rename = "rotY")]
    pub rot_y: i32,
    #[serde(rename = "rotZ")]
    pub rot_z: i32,
    pub uvlock: bool,
}

/// Result of blockstate resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionResult {
    #[serde(rename = "blockId")]
    pub block_id: String,
    #[serde(rename = "stateProps")]
    pub state_props: HashMap<String, String>,
    pub models: Vec<ResolvedModel>,
}

/// Build a BlockStateSchema from a blockstate file for UI generation
pub fn build_block_state_schema(blockstate: &Blockstate, block_id: &str) -> BlockStateSchema {
    let mut property_values: HashMap<String, HashSet<String>> = HashMap::new();
    let mut variants_map: HashMap<String, usize> = HashMap::new();

    // Scan variants to extract properties
    if let Some(variants) = &blockstate.variants {
        // Special case: if blockstate only has "" or "normal" variant, don't extract properties
        // This prevents generating fake properties for simple blocks like leaves
        let has_only_default =
            variants.len() == 1 && (variants.contains_key("") || variants.contains_key("normal"));

        if !has_only_default {
            for (key, variant) in variants {
                // Count models for this variant
                let model_count = match variant {
                    BlockstateVariant::Single(_) => 1,
                    BlockstateVariant::Multiple(models) => models.len(),
                };
                variants_map.insert(key.clone(), model_count);

                // Parse variant key: "facing=north,half=bottom" -> properties
                if !key.is_empty() && key != "normal" {
                    for prop_pair in key.split(',') {
                        if let Some((prop_name, prop_value)) = prop_pair.split_once('=') {
                            property_values
                                .entry(prop_name.to_string())
                                .or_insert_with(HashSet::new)
                                .insert(prop_value.to_string());
                        }
                    }
                }
            }
        } else {
            // For simple blocks, still record the variant in the map
            for (key, variant) in variants {
                let model_count = match variant {
                    BlockstateVariant::Single(_) => 1,
                    BlockstateVariant::Multiple(models) => models.len(),
                };
                variants_map.insert(key.clone(), model_count);
            }
        }
    }

    // Scan multipart to extract properties from when clauses
    if let Some(multipart) = &blockstate.multipart {
        for case in multipart {
            if let Some(when_value) = &case.when {
                extract_properties_from_when(when_value, &mut property_values);
            }
        }
    }

    // Build property schemas
    let mut properties: Vec<BlockPropertySchema> = property_values
        .iter()
        .map(|(name, values)| {
            let mut sorted_values: Vec<String> = values.iter().cloned().collect();
            sorted_values.sort();

            // Detect type
            let property_type = if sorted_values.len() == 2
                && sorted_values.contains(&"true".to_string())
                && sorted_values.contains(&"false".to_string())
            {
                "boolean"
            } else if sorted_values.iter().all(|v| v.parse::<i32>().is_ok()) {
                "int"
            } else {
                "enum"
            };

            let (min, max) = if property_type == "int" {
                let nums: Vec<i32> = sorted_values
                    .iter()
                    .filter_map(|v| v.parse().ok())
                    .collect();
                (nums.iter().min().copied(), nums.iter().max().copied())
            } else {
                (None, None)
            };

            BlockPropertySchema {
                name: name.clone(),
                property_type: property_type.to_string(),
                values: if property_type == "enum" || property_type == "boolean" {
                    Some(sorted_values.clone())
                } else {
                    None
                },
                min,
                max,
                default: sorted_values.first().cloned().unwrap_or_default(),
            }
        })
        .collect();

    // Sort properties by name for consistency
    properties.sort_by(|a, b| a.name.cmp(&b.name));

    // Build default state
    let default_state: HashMap<String, String> = properties
        .iter()
        .map(|p| (p.name.clone(), p.default.clone()))
        .collect();

    BlockStateSchema {
        block_id: block_id.to_string(),
        properties,
        default_state,
        variants_map: if variants_map.is_empty() {
            None
        } else {
            Some(variants_map)
        },
    }
}

/// Helper to extract properties from a when clause (recursively handles OR)
fn extract_properties_from_when(
    when_value: &serde_json::Value,
    property_values: &mut HashMap<String, HashSet<String>>,
) {
    if let Some(obj) = when_value.as_object() {
        for (key, value) in obj {
            if key == "OR" {
                // Handle OR array
                if let Some(arr) = value.as_array() {
                    for item in arr {
                        extract_properties_from_when(item, property_values);
                    }
                }
            } else {
                // Regular property
                let values_set = property_values
                    .entry(key.clone())
                    .or_insert_with(HashSet::new);

                if let Some(s) = value.as_str() {
                    // Single value or pipe-separated values
                    for val in s.split('|') {
                        values_set.insert(val.to_string());
                    }
                } else if let Some(arr) = value.as_array() {
                    for item in arr {
                        if let Some(s) = item.as_str() {
                            values_set.insert(s.to_string());
                        }
                    }
                }
            }
        }
    }
}

/// Resolve a blockstate with given properties to a list of models
pub fn resolve_blockstate(
    blockstate: &Blockstate,
    block_id: &str,
    state_props: Option<HashMap<String, String>>,
    seed: Option<u64>,
) -> AppResult<ResolutionResult> {
    println!("=== [resolve_blockstate] START ===");
    println!("[resolve_blockstate] block_id: {}", block_id);
    println!("[resolve_blockstate] state_props: {:?}", state_props);

    let props = state_props.unwrap_or_default();
    println!("[resolve_blockstate] Using props: {:?}", props);
    let mut resolved_models = Vec::new();

    // Handle variants format
    if let Some(variants) = &blockstate.variants {
        let variant_key = make_variant_key(&props);
        println!("[resolve_blockstate] Made variant key: '{}'", variant_key);
        println!(
            "[resolve_blockstate] Available variants: {:?}",
            variants.keys().collect::<Vec<_>>()
        );

        // Special case: if the blockstate only has "" or "normal" variant and nothing else,
        // always use it regardless of properties. This handles simple blocks like leaves
        // that have an empty blockstate but might have block properties added by the game.
        let has_only_default =
            variants.len() == 1 && (variants.contains_key("") || variants.contains_key("normal"));

        let variant = if has_only_default {
            println!(
                "[resolve_blockstate] Blockstate has only default variant, using it regardless of props"
            );
            variants.get("").or_else(|| variants.get("normal"))
        } else {
            // Try exact match, then empty string, then "normal"
            variants
                .get(&variant_key)
                .or_else(|| {
                    println!("[resolve_blockstate] No exact match, trying empty string");
                    variants.get("")
                })
                .or_else(|| {
                    println!("[resolve_blockstate] No empty string, trying 'normal'");
                    variants.get("normal")
                })
        };

        if let Some(var) = variant {
            println!("[resolve_blockstate] Found variant!");
            collect_models_from_variant(var, seed, &mut resolved_models)?;
        } else {
            println!("[resolve_blockstate] ERROR: No variant found!");
            return Err(AppError::validation(format!(
                "No variant found for key: '{}' in block '{}'",
                variant_key, block_id
            )));
        }
    }

    // Handle multipart format
    if let Some(multipart) = &blockstate.multipart {
        for (index, case) in multipart.iter().enumerate() {
            let matches = if let Some(when) = &case.when {
                matches_when_clause(&props, when)?
            } else {
                true // No condition = always applies
            };

            if matches {
                // Use different seed for each multipart case to get variety
                let case_seed = seed.map(|s| s.wrapping_add(index as u64));
                collect_models_from_variant(&case.apply, case_seed, &mut resolved_models)?;
            }
        }
    }

    if resolved_models.is_empty() {
        return Err(AppError::validation(format!(
            "No models resolved for block '{}'",
            block_id
        )));
    }

    Ok(ResolutionResult {
        block_id: block_id.to_string(),
        state_props: props,
        models: resolved_models,
    })
}

/// Build variant key from properties (sorted for consistency)
fn make_variant_key(props: &HashMap<String, String>) -> String {
    if props.is_empty() {
        return String::new();
    }

    let mut pairs: Vec<_> = props.iter().collect();
    pairs.sort_by_key(|(k, _)| *k);

    pairs
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join(",")
}

/// Collect models from a variant (handles weighted random selection)
fn collect_models_from_variant(
    variant: &BlockstateVariant,
    seed: Option<u64>,
    output: &mut Vec<ResolvedModel>,
) -> AppResult<()> {
    match variant {
        BlockstateVariant::Single(model_ref) => {
            output.push(to_resolved_model(model_ref));
        }
        BlockstateVariant::Multiple(models) => {
            if models.is_empty() {
                return Ok(());
            }

            // Pick one model based on weights
            let model_ref = if let Some(seed_val) = seed {
                pick_weighted_with_seed(models, seed_val)
            } else {
                // Default to first model if no seed
                &models[0]
            };

            output.push(to_resolved_model(model_ref));
        }
    }
    Ok(())
}

/// Pick a weighted random model using a seed
fn pick_weighted_with_seed(models: &[ModelReference], seed: u64) -> &ModelReference {
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let total_weight: i32 = models.iter().map(|m| m.weight.unwrap_or(1).max(1)).sum();

    if total_weight == 0 {
        return &models[0];
    }

    let mut roll = rng.gen_range(0..total_weight);

    for model in models {
        let weight = model.weight.unwrap_or(1).max(1);
        if roll < weight {
            return model;
        }
        roll -= weight;
    }

    &models[0] // Fallback
}

/// Convert ModelReference to ResolvedModel
fn to_resolved_model(model_ref: &ModelReference) -> ResolvedModel {
    ResolvedModel {
        model_id: model_ref.model.clone(),
        rot_x: model_ref.x.unwrap_or(0),
        rot_y: model_ref.y.unwrap_or(0),
        rot_z: model_ref.z.unwrap_or(0),
        uvlock: model_ref.uvlock.unwrap_or(false),
    }
}

/// Check if state properties match a when clause
fn matches_when_clause(
    props: &HashMap<String, String>,
    when: &serde_json::Value,
) -> AppResult<bool> {
    if let Some(obj) = when.as_object() {
        // Check for OR clause
        if let Some(or_value) = obj.get("OR") {
            if let Some(or_array) = or_value.as_array() {
                // OR: any child must match
                for child in or_array {
                    if matches_when_clause(props, child)? {
                        return Ok(true);
                    }
                }
                return Ok(false);
            }
        }

        // Simple AND matching (all properties must match)
        for (key, value) in obj {
            if key == "OR" {
                continue; // Already handled
            }

            let prop_value = props.get(key);

            if let Some(s) = value.as_str() {
                // Handle pipe-separated OR values: "up|side|none"
                let allowed: Vec<&str> = s.split('|').collect();
                let matches = prop_value
                    .map(|v| allowed.contains(&v.as_str()))
                    .unwrap_or(false);

                if !matches {
                    return Ok(false);
                }
            } else {
                return Ok(false);
            }
        }

        Ok(true)
    } else {
        Ok(false)
    }
}

// ============================================================================
// Legacy Utility Functions
// ============================================================================

/// Convert a texture ID to a blockstate block ID
///
/// "minecraft:block/dirt" -> "dirt"
/// "minecraft:block/amethyst_block1" -> "amethyst_block" (strips variant suffix)
/// "minecraft:block/acacia_log_top" -> "acacia_log" (strips texture part suffix)
/// "minecraft:item/stick" -> None (not a block)
pub fn texture_id_to_block_id(texture_id: &str) -> Option<String> {
    // Remove "minecraft:" prefix if present
    let without_namespace = texture_id.strip_prefix("minecraft:").unwrap_or(texture_id);

    // Check if it's a block texture
    if let Some(block_path) = without_namespace.strip_prefix("block/") {
        let mut block_id = block_path.to_string();

        // Strip common texture part suffixes (these are texture variants, not separate blocks)
        // e.g., "acacia_log_top" -> "acacia_log"
        let texture_suffixes = [
            "_top", "_bottom", "_side", "_front", "_back", "_end", "_north", "_south", "_east",
            "_west", "_up", "_down", "_inner", "_outer", "_upper", "_lower", "_0", "_1", "_2",
            "_3", "_4", "_5", // Stage variants
        ];

        for suffix in &texture_suffixes {
            if block_id.ends_with(suffix) {
                block_id = block_id.strip_suffix(suffix).unwrap().to_string();
                break;
            }
        }

        // Strip variant suffixes (numbers at the end that aren't preceded by underscore)
        // e.g., "amethyst_block1" -> "amethyst_block"
        // This handles texture variants like dirt0, dirt1, etc.
        if let Some(last_char) = block_id.chars().last() {
            if last_char.is_ascii_digit() && !block_id.ends_with('_') {
                // Find where the trailing digits start
                let trimmed = block_id.trim_end_matches(|c: char| c.is_ascii_digit());
                block_id = trimmed.to_string();
            }
        }

        Some(block_id)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_texture_id_to_block_id() {
        assert_eq!(
            texture_id_to_block_id("minecraft:block/dirt"),
            Some("dirt".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("block/stone"),
            Some("stone".to_string())
        );
        assert_eq!(texture_id_to_block_id("minecraft:item/stick"), None);

        // Test variant stripping
        assert_eq!(
            texture_id_to_block_id("minecraft:block/amethyst_block1"),
            Some("amethyst_block".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("minecraft:block/dirt0"),
            Some("dirt".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("minecraft:block/stone123"),
            Some("stone".to_string())
        );

        // Test texture part suffix stripping
        assert_eq!(
            texture_id_to_block_id("minecraft:block/acacia_log_top"),
            Some("acacia_log".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("minecraft:block/oak_log_top"),
            Some("oak_log".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("minecraft:block/furnace_front"),
            Some("furnace".to_string())
        );
        assert_eq!(
            texture_id_to_block_id("minecraft:block/grass_block_side"),
            Some("grass_block".to_string())
        );
    }

    #[test]
    fn test_make_variant_key() {
        // Empty props should produce empty string
        let props = HashMap::new();
        assert_eq!(make_variant_key(&props), "");

        // Single property
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "north".to_string());
        assert_eq!(make_variant_key(&props), "facing=north");

        // Multiple properties should be sorted alphabetically
        let mut props = HashMap::new();
        props.insert("half".to_string(), "bottom".to_string());
        props.insert("facing".to_string(), "north".to_string());
        props.insert("lit".to_string(), "true".to_string());
        assert_eq!(
            make_variant_key(&props),
            "facing=north,half=bottom,lit=true"
        );
    }

    #[test]
    fn test_matches_when_clause_simple() {
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "north".to_string());
        props.insert("lit".to_string(), "true".to_string());

        // Test simple property match
        let when = serde_json::json!({
            "facing": "north"
        });
        assert!(matches_when_clause(&props, &when).unwrap());

        // Test simple property mismatch
        let when = serde_json::json!({
            "facing": "south"
        });
        assert!(!matches_when_clause(&props, &when).unwrap());

        // Test multiple properties (AND)
        let when = serde_json::json!({
            "facing": "north",
            "lit": "true"
        });
        assert!(matches_when_clause(&props, &when).unwrap());

        // Test multiple properties with one mismatch
        let when = serde_json::json!({
            "facing": "north",
            "lit": "false"
        });
        assert!(!matches_when_clause(&props, &when).unwrap());
    }

    #[test]
    fn test_matches_when_clause_pipe_separated() {
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "east".to_string());

        // Test pipe-separated OR values
        let when = serde_json::json!({
            "facing": "north|south|east|west"
        });
        assert!(matches_when_clause(&props, &when).unwrap());

        let when = serde_json::json!({
            "facing": "up|down"
        });
        assert!(!matches_when_clause(&props, &when).unwrap());
    }

    #[test]
    fn test_matches_when_clause_or() {
        let mut props = HashMap::new();
        props.insert("north".to_string(), "true".to_string());
        props.insert("south".to_string(), "false".to_string());

        // Test OR clause (at least one must match)
        let when = serde_json::json!({
            "OR": [
                {"north": "true"},
                {"south": "true"}
            ]
        });
        assert!(matches_when_clause(&props, &when).unwrap());

        // Test OR clause with all mismatches
        let when = serde_json::json!({
            "OR": [
                {"north": "false"},
                {"south": "true"}
            ]
        });
        assert!(!matches_when_clause(&props, &when).unwrap());
    }

    #[test]
    fn test_pick_weighted_with_seed() {
        let models = vec![
            ModelReference {
                model: "model_a".to_string(),
                weight: Some(70),
                x: None,
                y: None,
                z: None,
                uvlock: None,
            },
            ModelReference {
                model: "model_b".to_string(),
                weight: Some(20),
                x: None,
                y: None,
                z: None,
                uvlock: None,
            },
            ModelReference {
                model: "model_c".to_string(),
                weight: Some(10),
                x: None,
                y: None,
                z: None,
                uvlock: None,
            },
        ];

        // Same seed should produce same result
        let result1 = pick_weighted_with_seed(&models, 42);
        let result2 = pick_weighted_with_seed(&models, 42);
        assert_eq!(result1.model, result2.model);

        // Different seeds might produce different results
        let result3 = pick_weighted_with_seed(&models, 123);
        // We can't assert they're different, but we can verify it's one of our models
        assert!(
            result3.model == "model_a" || result3.model == "model_b" || result3.model == "model_c"
        );
    }

    #[test]
    fn test_build_block_state_schema_variants() {
        // Create a simple variant-based blockstate (like furnace)
        let mut variants = HashMap::new();
        variants.insert(
            "facing=north,lit=false".to_string(),
            BlockstateVariant::Single(ModelReference {
                model: "minecraft:block/furnace".to_string(),
                weight: None,
                x: None,
                y: None,
                z: None,
                uvlock: None,
            }),
        );
        variants.insert(
            "facing=south,lit=true".to_string(),
            BlockstateVariant::Single(ModelReference {
                model: "minecraft:block/furnace_on".to_string(),
                weight: None,
                x: None,
                y: Some(180),
                z: None,
                uvlock: None,
            }),
        );

        let blockstate = Blockstate {
            variants: Some(variants),
            multipart: None,
        };

        let schema = build_block_state_schema(&blockstate, "minecraft:furnace");

        assert_eq!(schema.block_id, "minecraft:furnace");
        assert_eq!(schema.properties.len(), 2);

        // Check facing property
        let facing_prop = schema
            .properties
            .iter()
            .find(|p| p.name == "facing")
            .expect("facing property should exist");
        assert_eq!(facing_prop.property_type, "enum");
        assert!(facing_prop
            .values
            .as_ref()
            .unwrap()
            .contains(&"north".to_string()));
        assert!(facing_prop
            .values
            .as_ref()
            .unwrap()
            .contains(&"south".to_string()));

        // Check lit property
        let lit_prop = schema
            .properties
            .iter()
            .find(|p| p.name == "lit")
            .expect("lit property should exist");
        assert_eq!(lit_prop.property_type, "boolean");
        assert!(lit_prop
            .values
            .as_ref()
            .unwrap()
            .contains(&"true".to_string()));
        assert!(lit_prop
            .values
            .as_ref()
            .unwrap()
            .contains(&"false".to_string()));
    }

    #[test]
    fn test_resolve_blockstate_variants() {
        // Create a variant-based blockstate
        let mut variants = HashMap::new();
        variants.insert(
            "facing=north".to_string(),
            BlockstateVariant::Single(ModelReference {
                model: "minecraft:block/test".to_string(),
                weight: None,
                x: None,
                y: Some(0),
                z: None,
                uvlock: None,
            }),
        );
        variants.insert(
            "facing=south".to_string(),
            BlockstateVariant::Single(ModelReference {
                model: "minecraft:block/test".to_string(),
                weight: None,
                x: None,
                y: Some(180),
                z: None,
                uvlock: None,
            }),
        );

        let blockstate = Blockstate {
            variants: Some(variants),
            multipart: None,
        };

        // Test resolving with specific props
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "south".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:test", Some(props), None)
            .expect("should resolve successfully");

        assert_eq!(result.block_id, "minecraft:test");
        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/test");
        assert_eq!(result.models[0].rot_y, 180);
    }

    #[test]
    fn test_resolve_blockstate_weighted() {
        // Create a variant with multiple weighted models
        let mut variants = HashMap::new();
        variants.insert(
            "".to_string(),
            BlockstateVariant::Multiple(vec![
                ModelReference {
                    model: "model_a".to_string(),
                    weight: Some(50),
                    x: None,
                    y: None,
                    z: None,
                    uvlock: None,
                },
                ModelReference {
                    model: "model_b".to_string(),
                    weight: Some(50),
                    x: None,
                    y: None,
                    z: None,
                    uvlock: None,
                },
            ]),
        );

        let blockstate = Blockstate {
            variants: Some(variants),
            multipart: None,
        };

        // Same seed should produce same result
        let result1 = resolve_blockstate(&blockstate, "minecraft:test", None, Some(42))
            .expect("should resolve successfully");
        let result2 = resolve_blockstate(&blockstate, "minecraft:test", None, Some(42))
            .expect("should resolve successfully");

        assert_eq!(result1.models[0].model_id, result2.models[0].model_id);
    }

    #[test]
    fn test_resolve_blockstate_multipart() {
        // Create a simple multipart blockstate (like a fence)
        let multipart = vec![
            MultipartCase {
                when: None, // Always applies (center post)
                apply: BlockstateVariant::Single(ModelReference {
                    model: "minecraft:block/fence_post".to_string(),
                    weight: None,
                    x: None,
                    y: None,
                    z: None,
                    uvlock: None,
                }),
            },
            MultipartCase {
                when: Some(serde_json::json!({"north": "true"})),
                apply: BlockstateVariant::Single(ModelReference {
                    model: "minecraft:block/fence_side".to_string(),
                    weight: None,
                    x: None,
                    y: Some(0),
                    z: None,
                    uvlock: None,
                }),
            },
            MultipartCase {
                when: Some(serde_json::json!({"south": "true"})),
                apply: BlockstateVariant::Single(ModelReference {
                    model: "minecraft:block/fence_side".to_string(),
                    weight: None,
                    x: None,
                    y: Some(180),
                    z: None,
                    uvlock: None,
                }),
            },
        ];

        let blockstate = Blockstate {
            variants: None,
            multipart: Some(multipart),
        };

        // Test with north=true, south=false
        let mut props = HashMap::new();
        props.insert("north".to_string(), "true".to_string());
        props.insert("south".to_string(), "false".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:fence", Some(props), None)
            .expect("should resolve successfully");

        // Should get 2 models: post (always) + north side
        assert_eq!(result.models.len(), 2);
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/fence_post"));
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/fence_side" && m.rot_y == 0));
    }

    // ========================================================================
    // Integration Tests with Real Minecraft Blockstate JSON Examples
    // ========================================================================

    #[test]
    fn test_real_furnace_blockstate() {
        // Real Minecraft furnace blockstate (variant-based with facing and lit)
        let json = r#"{
            "variants": {
                "facing=north,lit=false": { "model": "minecraft:block/furnace" },
                "facing=south,lit=false": { "model": "minecraft:block/furnace", "y": 180 },
                "facing=west,lit=false": { "model": "minecraft:block/furnace", "y": 270 },
                "facing=east,lit=false": { "model": "minecraft:block/furnace", "y": 90 },
                "facing=north,lit=true": { "model": "minecraft:block/furnace_on" },
                "facing=south,lit=true": { "model": "minecraft:block/furnace_on", "y": 180 },
                "facing=west,lit=true": { "model": "minecraft:block/furnace_on", "y": 270 },
                "facing=east,lit=true": { "model": "minecraft:block/furnace_on", "y": 90 }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Test schema generation
        let schema = build_block_state_schema(&blockstate, "minecraft:furnace");
        assert_eq!(schema.properties.len(), 2);

        let facing = schema
            .properties
            .iter()
            .find(|p| p.name == "facing")
            .unwrap();
        assert_eq!(facing.property_type, "enum");
        assert_eq!(facing.values.as_ref().unwrap().len(), 4);

        let lit = schema.properties.iter().find(|p| p.name == "lit").unwrap();
        assert_eq!(lit.property_type, "boolean");

        // Test resolution - furnace facing south, lit
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "south".to_string());
        props.insert("lit".to_string(), "true".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:furnace", Some(props), None)
            .expect("should resolve");

        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/furnace_on");
        assert_eq!(result.models[0].rot_y, 180);
    }

    #[test]
    fn test_real_grass_block_weighted() {
        // Real Minecraft grass block with weighted random rotations
        let json = r#"{
            "variants": {
                "snowy=false": [
                    { "model": "minecraft:block/grass_block" },
                    { "model": "minecraft:block/grass_block", "y": 90 },
                    { "model": "minecraft:block/grass_block", "y": 180 },
                    { "model": "minecraft:block/grass_block", "y": 270 }
                ],
                "snowy=true": { "model": "minecraft:block/grass_block_snow" }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Test schema
        let schema = build_block_state_schema(&blockstate, "minecraft:grass_block");
        assert_eq!(schema.properties.len(), 1);

        let snowy = schema
            .properties
            .iter()
            .find(|p| p.name == "snowy")
            .unwrap();
        assert_eq!(snowy.property_type, "boolean");

        // Test snowy=false (should pick one of 4 rotations)
        let mut props = HashMap::new();
        props.insert("snowy".to_string(), "false".to_string());

        let result = resolve_blockstate(
            &blockstate,
            "minecraft:grass_block",
            Some(props.clone()),
            Some(42),
        )
        .expect("should resolve");

        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/grass_block");
        // Rotation should be one of 0, 90, 180, 270
        assert!([0, 90, 180, 270].contains(&result.models[0].rot_y));

        // Same seed should give same rotation
        let result2 =
            resolve_blockstate(&blockstate, "minecraft:grass_block", Some(props), Some(42))
                .expect("should resolve");
        assert_eq!(result.models[0].rot_y, result2.models[0].rot_y);

        // Test snowy=true (no randomness)
        let mut props = HashMap::new();
        props.insert("snowy".to_string(), "true".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:grass_block", Some(props), None)
            .expect("should resolve");

        assert_eq!(result.models.len(), 1);
        assert_eq!(
            result.models[0].model_id,
            "minecraft:block/grass_block_snow"
        );
    }

    #[test]
    fn test_real_oak_fence_multipart() {
        // Real Minecraft oak fence with multipart
        let json = r#"{
            "multipart": [
                { "apply": { "model": "minecraft:block/oak_fence_post" }},
                { "when": { "north": "true" },
                  "apply": { "model": "minecraft:block/oak_fence_side", "uvlock": true }
                },
                { "when": { "east": "true" },
                  "apply": { "model": "minecraft:block/oak_fence_side", "y": 90, "uvlock": true }
                },
                { "when": { "south": "true" },
                  "apply": { "model": "minecraft:block/oak_fence_side", "y": 180, "uvlock": true }
                },
                { "when": { "west": "true" },
                  "apply": { "model": "minecraft:block/oak_fence_side", "y": 270, "uvlock": true }
                }
            ]
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Test schema
        let schema = build_block_state_schema(&blockstate, "minecraft:oak_fence");
        assert_eq!(schema.properties.len(), 4);
        // Verify all 4 directional properties are detected
        for prop in &schema.properties {
            assert!(["north", "south", "east", "west"].contains(&prop.name.as_str()));
        }

        // Test isolated fence (no connections)
        let mut props = HashMap::new();
        props.insert("north".to_string(), "false".to_string());
        props.insert("south".to_string(), "false".to_string());
        props.insert("east".to_string(), "false".to_string());
        props.insert("west".to_string(), "false".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:oak_fence", Some(props), None)
            .expect("should resolve");

        // Should only have post (no sides)
        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/oak_fence_post");

        // Test fence with north and south connections (straight line)
        let mut props = HashMap::new();
        props.insert("north".to_string(), "true".to_string());
        props.insert("south".to_string(), "true".to_string());
        props.insert("east".to_string(), "false".to_string());
        props.insert("west".to_string(), "false".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:oak_fence", Some(props), None)
            .expect("should resolve");

        // Should have post + north side + south side
        assert_eq!(result.models.len(), 3);
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/oak_fence_post"));
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/oak_fence_side" && m.rot_y == 0 && m.uvlock));
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/oak_fence_side" && m.rot_y == 180 && m.uvlock));

        // Test all connections
        let mut props = HashMap::new();
        props.insert("north".to_string(), "true".to_string());
        props.insert("south".to_string(), "true".to_string());
        props.insert("east".to_string(), "true".to_string());
        props.insert("west".to_string(), "true".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:oak_fence", Some(props), None)
            .expect("should resolve");

        // Should have post + all 4 sides
        assert_eq!(result.models.len(), 5);
    }

    #[test]
    fn test_real_stairs_blockstate() {
        // Real Minecraft stairs with facing, half, and shape properties
        let json = r#"{
            "variants": {
                "facing=east,half=bottom,shape=straight": { "model": "minecraft:block/oak_stairs" },
                "facing=west,half=bottom,shape=straight": { "model": "minecraft:block/oak_stairs", "y": 180, "uvlock": true },
                "facing=south,half=bottom,shape=straight": { "model": "minecraft:block/oak_stairs", "y": 90, "uvlock": true },
                "facing=north,half=bottom,shape=straight": { "model": "minecraft:block/oak_stairs", "y": 270, "uvlock": true },
                "facing=east,half=top,shape=straight": { "model": "minecraft:block/oak_stairs", "x": 180, "uvlock": true },
                "facing=west,half=top,shape=straight": { "model": "minecraft:block/oak_stairs", "x": 180, "y": 180, "uvlock": true },
                "facing=south,half=top,shape=straight": { "model": "minecraft:block/oak_stairs", "x": 180, "y": 90, "uvlock": true },
                "facing=north,half=top,shape=straight": { "model": "minecraft:block/oak_stairs", "x": 180, "y": 270, "uvlock": true }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Test schema
        let schema = build_block_state_schema(&blockstate, "minecraft:oak_stairs");
        assert_eq!(schema.properties.len(), 3);

        let facing = schema
            .properties
            .iter()
            .find(|p| p.name == "facing")
            .unwrap();
        assert_eq!(facing.property_type, "enum");
        assert_eq!(facing.values.as_ref().unwrap().len(), 4);

        let half = schema.properties.iter().find(|p| p.name == "half").unwrap();
        assert_eq!(half.property_type, "enum");

        let shape = schema
            .properties
            .iter()
            .find(|p| p.name == "shape")
            .unwrap();
        assert_eq!(shape.property_type, "enum");

        // Test upside-down stairs facing south
        let mut props = HashMap::new();
        props.insert("facing".to_string(), "south".to_string());
        props.insert("half".to_string(), "top".to_string());
        props.insert("shape".to_string(), "straight".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:oak_stairs", Some(props), None)
            .expect("should resolve");

        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/oak_stairs");
        assert_eq!(result.models[0].rot_x, 180);
        assert_eq!(result.models[0].rot_y, 90);
        assert!(result.models[0].uvlock);
    }

    #[test]
    fn test_redstone_wire_complex_multipart() {
        // Simplified redstone wire with OR conditions
        let json = r#"{
            "multipart": [
                {
                    "when": {
                        "OR": [
                            { "north": "side|up" },
                            { "south": "side|up" }
                        ]
                    },
                    "apply": { "model": "minecraft:block/redstone_dust_line" }
                },
                {
                    "when": { "west": "side|up" },
                    "apply": { "model": "minecraft:block/redstone_dust_side", "y": 270 }
                },
                {
                    "when": { "east": "none" },
                    "apply": { "model": "minecraft:block/redstone_dust_dot" }
                }
            ]
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Test with north=up (should trigger OR condition)
        let mut props = HashMap::new();
        props.insert("north".to_string(), "up".to_string());
        props.insert("south".to_string(), "none".to_string());
        props.insert("east".to_string(), "none".to_string());
        props.insert("west".to_string(), "none".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:redstone_wire", Some(props), None)
            .expect("should resolve");

        // Should have line (north OR matched) + dot (east=none)
        assert_eq!(result.models.len(), 2);
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/redstone_dust_line"));
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/redstone_dust_dot"));

        // Test with west=side
        let mut props = HashMap::new();
        props.insert("north".to_string(), "none".to_string());
        props.insert("south".to_string(), "none".to_string());
        props.insert("east".to_string(), "side".to_string());
        props.insert("west".to_string(), "side".to_string());

        let result = resolve_blockstate(&blockstate, "minecraft:redstone_wire", Some(props), None)
            .expect("should resolve");

        // Should have west side model
        assert!(result
            .models
            .iter()
            .any(|m| m.model_id == "minecraft:block/redstone_dust_side" && m.rot_y == 270));
    }

    #[test]
    fn test_integer_property_detection() {
        // Test with age property (0-7 for crops)
        let json = r#"{
            "variants": {
                "age=0": { "model": "minecraft:block/wheat_stage0" },
                "age=1": { "model": "minecraft:block/wheat_stage1" },
                "age=2": { "model": "minecraft:block/wheat_stage2" },
                "age=7": { "model": "minecraft:block/wheat_stage7" }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");
        let schema = build_block_state_schema(&blockstate, "minecraft:wheat");

        let age = schema.properties.iter().find(|p| p.name == "age").unwrap();
        assert_eq!(age.property_type, "int");
        assert_eq!(age.min, Some(0));
        assert_eq!(age.max, Some(7));
    }

    // ========================================================================
    // Regression Tests for Bug Fixes
    // ========================================================================

    #[test]
    fn test_default_state_application_when_props_empty() {
        // Regression test: blocks with required properties should use defaults when props are empty
        // This was the acacia_leaves bug - it has a "distance" property but we were passing empty props
        let json = r#"{
            "variants": {
                "distance=1": { "model": "minecraft:block/acacia_leaves" },
                "distance=2": { "model": "minecraft:block/acacia_leaves" },
                "distance=3": { "model": "minecraft:block/acacia_leaves" }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Build schema to get default state
        let schema = build_block_state_schema(&blockstate, "acacia_leaves");
        assert_eq!(schema.properties.len(), 1);
        assert_eq!(schema.properties[0].name, "distance");
        assert!(
            !schema.default_state.is_empty(),
            "Default state should not be empty"
        );

        // The default should be the first value alphabetically
        assert_eq!(schema.default_state.get("distance"), Some(&"1".to_string()));

        // Resolution with the default state should work
        let result = resolve_blockstate(
            &blockstate,
            "acacia_leaves",
            Some(schema.default_state),
            None,
        )
        .expect("should resolve with default state");
        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/acacia_leaves");
    }

    #[test]
    fn test_empty_props_fallback_to_empty_variant() {
        // Some blocks have an empty variant that should match when no props given
        let json = r#"{
            "variants": {
                "": { "model": "minecraft:block/dirt" },
                "snowy=true": { "model": "minecraft:block/dirt_snow" }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Empty props should match the "" variant
        let result = resolve_blockstate(&blockstate, "dirt", None, None)
            .expect("should resolve with empty variant");
        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/dirt");
    }

    #[test]
    fn test_camelcase_serialization() {
        // Regression test: ensure all fields serialize to camelCase for TypeScript compatibility
        let model = ResolvedModel {
            model_id: "minecraft:block/test".to_string(),
            rot_x: 90,
            rot_y: 180,
            rot_z: 270,
            uvlock: true,
        };

        let json = serde_json::to_string(&model).expect("should serialize");

        // Check that it uses camelCase field names
        assert!(
            json.contains("\"modelId\""),
            "model_id should serialize as modelId"
        );
        assert!(json.contains("\"rotX\""), "rot_x should serialize as rotX");
        assert!(json.contains("\"rotY\""), "rot_y should serialize as rotY");
        assert!(json.contains("\"rotZ\""), "rot_z should serialize as rotZ");
        assert!(json.contains("\"uvlock\""), "uvlock should stay as uvlock");

        // Verify it deserializes back correctly
        let deserialized: ResolvedModel = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized.model_id, "minecraft:block/test");
        assert_eq!(deserialized.rot_x, 90);
        assert_eq!(deserialized.rot_y, 180);
        assert_eq!(deserialized.rot_z, 270);
        assert_eq!(deserialized.uvlock, true);
    }

    #[test]
    fn test_resolution_result_camelcase() {
        // Test that ResolutionResult also serializes correctly
        let result = ResolutionResult {
            block_id: "test_block".to_string(),
            state_props: {
                let mut map = HashMap::new();
                map.insert("facing".to_string(), "north".to_string());
                map
            },
            models: vec![ResolvedModel {
                model_id: "minecraft:block/test".to_string(),
                rot_x: 0,
                rot_y: 90,
                rot_z: 0,
                uvlock: false,
            }],
        };

        let json = serde_json::to_string(&result).expect("should serialize");

        assert!(
            json.contains("\"blockId\""),
            "block_id should serialize as blockId"
        );
        assert!(
            json.contains("\"stateProps\""),
            "state_props should serialize as stateProps"
        );
        assert!(json.contains("\"models\""), "models should stay as models");
    }

    #[test]
    fn test_blockstate_schema_camelcase() {
        // Test that BlockStateSchema serializes correctly
        let schema = BlockStateSchema {
            block_id: "test".to_string(),
            properties: vec![],
            default_state: HashMap::new(),
            variants_map: Some({
                let mut map = HashMap::new();
                map.insert("key".to_string(), 1);
                map
            }),
        };

        let json = serde_json::to_string(&schema).expect("should serialize");

        assert!(
            json.contains("\"blockId\""),
            "block_id should serialize as blockId"
        );
        assert!(
            json.contains("\"defaultState\""),
            "default_state should serialize as defaultState"
        );
        assert!(
            json.contains("\"variantsMap\""),
            "variants_map should serialize as variantsMap"
        );
    }

    #[test]
    fn test_variant_key_with_required_properties() {
        // Regression test: blocks with required properties need proper variant key generation
        let json = r#"{
            "variants": {
                "axis=x": { "model": "minecraft:block/acacia_log_horizontal", "x": 90, "y": 90 },
                "axis=y": { "model": "minecraft:block/acacia_log" },
                "axis=z": { "model": "minecraft:block/acacia_log_horizontal", "x": 90 }
            }
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // Build schema
        let schema = build_block_state_schema(&blockstate, "acacia_log");
        assert_eq!(schema.properties.len(), 1);
        assert_eq!(schema.properties[0].name, "axis");
        assert_eq!(schema.default_state.get("axis"), Some(&"x".to_string()));

        // Test resolution with each axis value
        for axis in &["x", "y", "z"] {
            let mut props = HashMap::new();
            props.insert("axis".to_string(), axis.to_string());

            let result = resolve_blockstate(&blockstate, "acacia_log", Some(props), None)
                .expect(&format!("should resolve axis={}", axis));
            assert_eq!(result.models.len(), 1);
        }
    }

    #[test]
    fn test_multipart_with_no_when_clause() {
        // Multipart blocks should apply unconditional parts (no "when" clause) to all states
        let json = r#"{
            "multipart": [
                { "apply": { "model": "minecraft:block/fence_post" }},
                { "when": { "north": "true" },
                  "apply": { "model": "minecraft:block/fence_side" }
                }
            ]
        }"#;

        let blockstate: Blockstate = serde_json::from_str(json).expect("valid JSON");

        // With no connections, should only get the post
        let result = resolve_blockstate(&blockstate, "fence", None, None).expect("should resolve");
        assert_eq!(result.models.len(), 1);
        assert_eq!(result.models[0].model_id, "minecraft:block/fence_post");

        // With north=true, should get post + side
        let mut props = HashMap::new();
        props.insert("north".to_string(), "true".to_string());

        let result =
            resolve_blockstate(&blockstate, "fence", Some(props), None).expect("should resolve");
        assert_eq!(result.models.len(), 2);
    }
}
