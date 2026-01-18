/// Animation Data TypeScript Generator
///
/// Generates TypeScript files for vanilla Minecraft animations extracted from JAR.
/// Creates individual files per entity (bell.ts, chest.ts, zombie.ts, etc.)
/// and an index file that exports all animations.
///
/// NOTE: Resource pack animations (e.g., Fresh Animations) take priority over these
/// vanilla extracted animations. The animation system will merge them accordingly.

use anyhow::{Context, Result};
use std::fs;
use std::path::Path;
use super::block_animation_extractor::{ExtractedAnimationData, EntityAnimations, Animation, AnimationTrigger, PartAnimation, Keyframe, MobModel};

/// Generate TypeScript animation files from extracted data
///
/// Creates:
/// - src/constants/animations/generated/{entity}.ts for each entity
/// - src/constants/animations/generated/index.ts with exports
pub fn generate_animation_typescript(
    animations: &ExtractedAnimationData,
    output_dir: &Path,
) -> Result<()> {
    // Create output directory
    fs::create_dir_all(output_dir).context("Failed to create output directory")?;

    // Get timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let datetime = chrono::DateTime::from_timestamp(timestamp as i64, 0)
        .unwrap()
        .to_rfc3339();

    // Generate block entity keyframe animations
    let mut block_entity_ids: Vec<String> = animations.entities.keys().cloned().collect();
    block_entity_ids.sort();

    for entity_id in &block_entity_ids {
        let entity_animations = &animations.entities[entity_id];
        generate_entity_file(entity_animations, output_dir, &animations.version, &datetime)?;
    }

    // Generate mob model JPM animations
    let mut mob_entity_ids: Vec<String> = animations.mob_models.keys().cloned().collect();
    mob_entity_ids.sort();

    for entity_id in &mob_entity_ids {
        let mob_model = &animations.mob_models[entity_id];
        // Apply entity-specific post-processing
        let processed_model = apply_entity_post_processing(mob_model);
        generate_mob_model_file(&processed_model, output_dir, &animations.version, &datetime)?;
    }

    // Combine all entity IDs for index
    let mut all_entity_ids = block_entity_ids.clone();
    all_entity_ids.extend(mob_entity_ids.clone());
    all_entity_ids.sort();

    // Generate index file
    generate_index_file(&all_entity_ids, output_dir, &animations.version, &datetime)?;

    println!(
        "[animation_typescript] Generated {} animation files ({} blocks, {} mobs) in {:?}",
        all_entity_ids.len(),
        block_entity_ids.len(),
        mob_entity_ids.len(),
        output_dir
    );

    Ok(())
}

/// Generate TypeScript file for a single entity
fn generate_entity_file(
    entity: &EntityAnimations,
    output_dir: &Path,
    version: &str,
    datetime: &str,
) -> Result<()> {
    let entity_id = &entity.entity_id;
    let file_name = format!("{}.ts", entity_id);
    let output_path = output_dir.join(&file_name);

    // Convert animations to TypeScript format
    let mut animations_ts = String::new();
    animations_ts.push_str("{\n");

    for (i, animation) in entity.animations.iter().enumerate() {
        if i > 0 {
            animations_ts.push_str(",\n");
        }
        animations_ts.push_str(&format_animation(animation));
    }

    animations_ts.push_str("\n}");

    // Generate TypeScript constant name (e.g., "bell" -> "bellAnimations")
    let const_name = format!("{}Animations", entity_id);
    let type_name = format!("{}AnimationName", to_pascal_case(entity_id));

    let ts_content = format!(
        r#"/**
 * Vanilla Minecraft Animations - {}
 *
 * Auto-generated from Minecraft {} by Rust extraction.
 * Do not edit manually - changes will be overwritten.
 *
 * Generated at: {}
 *
 * NOTE: Resource pack animations (e.g., Fresh Animations) take priority.
 * These are fallback vanilla animations extracted from Minecraft's code.
 */

export const {} = {} as const;

export type {} = keyof typeof {};
"#,
        entity_id,
        version,
        datetime,
        const_name,
        animations_ts,
        type_name,
        const_name,
    );

    let tmp_path = output_path.with_extension("ts.tmp");
    fs::write(&tmp_path, ts_content)
        .context(format!("Failed to write {}", file_name))?;
    fs::rename(&tmp_path, &output_path)
        .context(format!("Failed to finalize {}", file_name))?;

    Ok(())
}

/// Apply entity-specific post-processing to fix animation issues
///
/// Bell fix:
/// In Minecraft's model, bell_base is a CHILD of bell_body. When bell_body rotates,
/// bell_base automatically inherits that rotation through the scene graph hierarchy.
/// We should NOT animate base separately - doing so would double the rotation.
///
/// The bell rotates on ONE axis at a time based on shakeDirection:
/// - NORTH/SOUTH: uses xRot (body.rx)
/// - EAST/WEST: uses zRot (body.rz)
///
/// We keep BOTH body.rx and body.rz - the AnimationEngine chooses which to apply
/// based on swing_direction at runtime.
fn apply_entity_post_processing(mob_model: &MobModel) -> MobModel {
    let mut result = mob_model.clone();

    if mob_model.entity_id == "bell" {
        // Process each animation layer
        for layer in &mut result.animation_layers {
            // KEEP body.rx and body.rz - AnimationEngine will choose based on swing_direction

            // DO NOT animate base - it's a child of body and inherits rotation automatically
            // Adding base.rz would DOUBLE the rotation, making them appear to move opposite
            layer.expressions.remove("base.rz");
            layer.expressions.remove("base.rx");
        }

        println!("[animation_typescript] Applied bell post-processing: body.rx and body.rz kept for direction-based swing (base inherits as child)");
    }

    result
}

/// Generate TypeScript file for a mob model (JPM animation layers)
fn generate_mob_model_file(
    mob_model: &MobModel,
    output_dir: &Path,
    version: &str,
    datetime: &str,
) -> Result<()> {
    let entity_id = &mob_model.entity_id;
    let file_name = format!("{}.ts", entity_id);
    let output_path = output_dir.join(&file_name);

    // Convert JPM animation layers to TypeScript format
    let mut layers_ts = String::new();
    layers_ts.push_str("[\n");

    for (i, layer) in mob_model.animation_layers.iter().enumerate() {
        if i > 0 {
            layers_ts.push_str(",\n");
        }
        layers_ts.push_str("  {\n");

        let mut expressions: Vec<(String, String)> = layer.expressions.iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        expressions.sort_by(|a, b| a.0.cmp(&b.0));

        for (j, (property, expression)) in expressions.iter().enumerate() {
            if j > 0 {
                layers_ts.push_str(",\n");
            }
            // Escape quotes in expressions
            let escaped_expr = expression.replace('\\', "\\\\").replace('"', "\\\"");
            layers_ts.push_str(&format!("    \"{}\": \"{}\"", property, escaped_expr));
        }

        layers_ts.push_str("\n  }");
    }

    layers_ts.push_str("\n]");

    // Generate TypeScript constant name
    // Block entities: "bell" -> "bellAnimations"
    // Mobs: "zombie" -> "zombieModel"
    let (const_name, export_type) = if mob_model.is_block_entity {
        (format!("{}Animations", entity_id), "Animation")
    } else {
        (format!("{}Model", entity_id), "Model")
    };

    // Add trigger metadata for block entities
    let trigger_comment = if let Some(ref trigger) = mob_model.trigger {
        format!("\n * Trigger: {:?} - Animation plays when this condition is met", trigger)
    } else {
        String::new()
    };

    // Add trigger export for block entities
    let trigger_export = if let Some(ref trigger) = mob_model.trigger {
        let trigger_value = match trigger {
            AnimationTrigger::Always => "always",
            AnimationTrigger::Interact => "interact",
            AnimationTrigger::Redstone => "redstone",
            AnimationTrigger::Damage => "damage",
            AnimationTrigger::Walk => "walk",
            AnimationTrigger::Custom(s) => s.as_str(),
        };
        format!("\n\nexport const {}Trigger = '{}' as const;", entity_id, trigger_value)
    } else {
        String::new()
    };

    // Add hierarchy export if present
    // Format: { bone_name: "parent_name" | null }
    let hierarchy_export = if !mob_model.hierarchy.is_empty() {
        let mut hierarchy_ts = String::new();
        hierarchy_ts.push_str("{\n");

        let mut entries: Vec<(&String, &Option<String>)> = mob_model.hierarchy.iter().collect();
        entries.sort_by(|a, b| a.0.cmp(b.0));

        for (i, (bone, parent)) in entries.iter().enumerate() {
            if i > 0 {
                hierarchy_ts.push_str(",\n");
            }
            match parent {
                Some(p) => hierarchy_ts.push_str(&format!("  \"{}\": \"{}\"", bone, p)),
                None => hierarchy_ts.push_str(&format!("  \"{}\": null", bone)),
            }
        }
        hierarchy_ts.push_str("\n}");

        format!("\n\n/** Model hierarchy: bone -> parent (null = root) */\nexport const {}Hierarchy = {} as const;", entity_id, hierarchy_ts)
    } else {
        String::new()
    };

    // Add duration export if present (in game ticks, 20 ticks = 1 second)
    let duration_export = if let Some(duration) = mob_model.duration_ticks {
        format!("\n\n/** Animation duration in game ticks (20 ticks = 1 second) */\nexport const {}Duration = {} as const;", entity_id, duration)
    } else {
        String::new()
    };

    let ts_content = format!(
        r#"/**
 * Vanilla Minecraft {} - {}
 *
 * Auto-generated from Minecraft {} by Rust extraction.
 * Do not edit manually - changes will be overwritten.
 *
 * Generated at: {}{}
 *
 * This is a JPM (Java Procedural Model) animation extracted from {}Model.java.
 * Contains vanilla animation expressions that can be run by the AnimationEngine.
 *
 * NOTE: Resource pack animations (e.g., Fresh Animations) take priority.
 * This is the fallback vanilla model animation extracted from Minecraft's code.
 */

export const {} = {} as const;{}{}{}
"#,
        export_type,
        entity_id,
        version,
        datetime,
        trigger_comment,
        to_pascal_case(entity_id),
        const_name,
        layers_ts,
        trigger_export,
        hierarchy_export,
        duration_export,
    );

    let tmp_path = output_path.with_extension("ts.tmp");
    fs::write(&tmp_path, ts_content)
        .context(format!("Failed to write {}", file_name))?;
    fs::rename(&tmp_path, &output_path)
        .context(format!("Failed to finalize {}", file_name))?;

    Ok(())
}

/// Generate index file that exports all entity animations
fn generate_index_file(
    all_entity_ids: &[String],
    output_dir: &Path,
    version: &str,
    datetime: &str,
) -> Result<()> {
    // Determine which entities are blocks vs mobs and which have hierarchies/durations
    let mut block_entities = Vec::new();
    let mut mob_entities = Vec::new();
    let mut entities_with_hierarchy = Vec::new();
    let mut entities_with_duration = Vec::new();

    for entity_id in all_entity_ids {
        let file_path = output_dir.join(format!("{}.ts", entity_id));
        if let Ok(content) = fs::read_to_string(&file_path) {
            if content.contains("Animations =") {
                block_entities.push(entity_id.clone());
            } else if content.contains("Model =") {
                mob_entities.push(entity_id.clone());
            }
            // Check if this entity has hierarchy export
            if content.contains("Hierarchy =") {
                entities_with_hierarchy.push(entity_id.clone());
            }
            // Check if this entity has duration export
            if content.contains("Duration =") {
                entities_with_duration.push(entity_id.clone());
            }
        }
    }

    let output_path = output_dir.join("index.ts");

    // Generate imports and exports
    let mut imports = String::new();
    let mut exports = String::new();

    for entity_id in &block_entities {
        let const_name = format!("{}Animations", entity_id);
        imports.push_str(&format!("import {{ {} }} from './{}';\n", const_name, entity_id));
        exports.push_str(&format!("export * from './{}';\n", entity_id));
    }

    for entity_id in &mob_entities {
        let const_name = format!("{}Model", entity_id);
        imports.push_str(&format!("import {{ {} }} from './{}';\n", const_name, entity_id));
        exports.push_str(&format!("export * from './{}';\n", entity_id));
    }

    // Import hierarchies
    for entity_id in &entities_with_hierarchy {
        let hierarchy_name = format!("{}Hierarchy", entity_id);
        // Only add if not already imported (block entities already export everything)
        if !block_entities.contains(entity_id) && !mob_entities.contains(entity_id) {
            imports.push_str(&format!("import {{ {} }} from './{}';\n", hierarchy_name, entity_id));
        } else {
            // Add specific hierarchy import
            imports.push_str(&format!("import {{ {} }} from './{}';\n", hierarchy_name, entity_id));
        }
    }

    // Import durations
    for entity_id in &entities_with_duration {
        let duration_name = format!("{}Duration", entity_id);
        // Only add if not already re-exported
        if !block_entities.contains(entity_id) && !mob_entities.contains(entity_id) {
            imports.push_str(&format!("import {{ {} }} from './{}';\n", duration_name, entity_id));
        } else {
            imports.push_str(&format!("import {{ {} }} from './{}';\n", duration_name, entity_id));
        }
    }

    // Generate VANILLA_ANIMATIONS object (blocks only - keyframe animations)
    let mut vanilla_animations = String::new();
    vanilla_animations.push_str("{\n");
    for (i, entity_id) in block_entities.iter().enumerate() {
        if i > 0 {
            vanilla_animations.push_str(",\n");
        }
        let const_name = format!("{}Animations", entity_id);
        vanilla_animations.push_str(&format!("  '{}': {}", entity_id, const_name));
    }
    vanilla_animations.push_str("\n}");

    // Generate VANILLA_MOB_MODELS object (mobs only - JPM animations)
    let mut vanilla_mob_models = String::new();
    vanilla_mob_models.push_str("{\n");
    for (i, entity_id) in mob_entities.iter().enumerate() {
        if i > 0 {
            vanilla_mob_models.push_str(",\n");
        }
        let const_name = format!("{}Model", entity_id);
        vanilla_mob_models.push_str(&format!("  '{}': {}", entity_id, const_name));
    }
    vanilla_mob_models.push_str("\n}");

    // Generate VANILLA_HIERARCHIES object (all entities with hierarchy data)
    let mut vanilla_hierarchies = String::new();
    vanilla_hierarchies.push_str("{\n");
    for (i, entity_id) in entities_with_hierarchy.iter().enumerate() {
        if i > 0 {
            vanilla_hierarchies.push_str(",\n");
        }
        let hierarchy_name = format!("{}Hierarchy", entity_id);
        vanilla_hierarchies.push_str(&format!("  '{}': {}", entity_id, hierarchy_name));
    }
    vanilla_hierarchies.push_str("\n}");

    // Generate VANILLA_DURATIONS object (entities with extracted duration in ticks)
    let mut vanilla_durations = String::new();
    vanilla_durations.push_str("{\n");
    for (i, entity_id) in entities_with_duration.iter().enumerate() {
        if i > 0 {
            vanilla_durations.push_str(",\n");
        }
        let duration_name = format!("{}Duration", entity_id);
        vanilla_durations.push_str(&format!("  '{}': {}", entity_id, duration_name));
    }
    vanilla_durations.push_str("\n}");

    let ts_content = format!(
        r#"/**
 * Vanilla Minecraft Animations - Index
 *
 * Auto-generated from Minecraft {} by Rust extraction.
 * Do not edit manually - changes will be overwritten.
 *
 * Generated at: {}
 *
 * USAGE:
 * ```typescript
 * import {{ VANILLA_ANIMATIONS, VANILLA_MOB_MODELS, VANILLA_DURATIONS }} from '@constants/animations/generated';
 *
 * // Block keyframe animations
 * const bellAnims = VANILLA_ANIMATIONS.bell;
 * if (bellAnims?.ring) {{
 *   playAnimation('ring', bellAnims.ring);
 * }}
 *
 * // Mob JPM animations
 * const zombieModel = VANILLA_MOB_MODELS.zombie;
 * // Feed to AnimationEngine for procedural animation
 *
 * // Animation durations (in game ticks, 20 ticks = 1 second)
 * const bellDuration = VANILLA_DURATIONS.bell; // 50 ticks = 2.5 seconds
 * ```
 *
 * NOTE: Resource pack animations (e.g., Fresh Animations) take priority.
 * These are fallback vanilla animations extracted from Minecraft's code.
 */

{}
{}
/** Block entity keyframe animations (bell, chest, shulker) */
export const VANILLA_ANIMATIONS = {} as const;

/** Mob model JPM animations (zombie, creeper, cow, etc.) */
export const VANILLA_MOB_MODELS = {} as const;

/** Model hierarchies extracted from Minecraft (bone -> parent, null = root) */
export const VANILLA_HIERARCHIES = {} as const;

/** Animation durations in game ticks (20 ticks = 1 second) */
export const VANILLA_DURATIONS = {} as const;
"#,
        version,
        datetime,
        imports,
        exports,
        vanilla_animations,
        vanilla_mob_models,
        vanilla_hierarchies,
        vanilla_durations,
    );

    let tmp_path = output_path.with_extension("ts.tmp");
    fs::write(&tmp_path, ts_content)
        .context("Failed to write index.ts")?;
    fs::rename(&tmp_path, &output_path)
        .context("Failed to finalize index.ts")?;

    Ok(())
}

/// Format a single animation as TypeScript object
fn format_animation(animation: &Animation) -> String {
    let mut output = String::new();
    output.push_str(&format!("  {}: {{\n", animation.name));
    output.push_str(&format!("    trigger: '{}',\n", trigger_to_string(&animation.trigger)));
    output.push_str(&format!("    duration: {},\n", animation.duration_ticks));
    output.push_str(&format!("    looping: {},\n", animation.looping));
    output.push_str("    parts: {\n");

    let mut part_names: Vec<&String> = animation.parts.keys().collect();
    part_names.sort();

    for (i, part_name) in part_names.iter().enumerate() {
        if i > 0 {
            output.push_str(",\n");
        }
        let part_anim = &animation.parts[*part_name];
        output.push_str(&format_part_animation(part_name, part_anim));
    }

    output.push_str("\n    }");
    output.push_str("\n  }");
    output
}

/// Format a part animation with its keyframes
fn format_part_animation(part_name: &str, part: &PartAnimation) -> String {
    let mut output = String::new();
    output.push_str(&format!("      '{}': {{\n", part_name));

    let mut has_field = false;

    if let Some(keyframes) = &part.rotation_x {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        rotationX: {}", format_keyframes(keyframes)));
        has_field = true;
    }

    if let Some(keyframes) = &part.rotation_y {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        rotationY: {}", format_keyframes(keyframes)));
        has_field = true;
    }

    if let Some(keyframes) = &part.rotation_z {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        rotationZ: {}", format_keyframes(keyframes)));
        has_field = true;
    }

    if let Some(keyframes) = &part.position_x {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        positionX: {}", format_keyframes(keyframes)));
        has_field = true;
    }

    if let Some(keyframes) = &part.position_y {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        positionY: {}", format_keyframes(keyframes)));
        has_field = true;
    }

    if let Some(keyframes) = &part.position_z {
        if has_field {
            output.push_str(",\n");
        }
        output.push_str(&format!("        positionZ: {}", format_keyframes(keyframes)));
    }

    output.push_str("\n      }");
    output
}

/// Format keyframes array
fn format_keyframes(keyframes: &[Keyframe]) -> String {
    if keyframes.is_empty() {
        return "[]".to_string();
    }

    let mut output = String::from("[\n");
    for (i, keyframe) in keyframes.iter().enumerate() {
        if i > 0 {
            output.push_str(",\n");
        }
        output.push_str(&format!(
            "          {{ time: {}, value: {}, interpolation: '{}' }}",
            keyframe.time,
            keyframe.value,
            keyframe.interpolation
        ));
    }
    output.push_str("\n        ]");
    output
}

/// Convert AnimationTrigger to string
fn trigger_to_string(trigger: &AnimationTrigger) -> String {
    match trigger {
        AnimationTrigger::Always => "always".to_string(),
        AnimationTrigger::Interact => "interact".to_string(),
        AnimationTrigger::Redstone => "redstone".to_string(),
        AnimationTrigger::Damage => "damage".to_string(),
        AnimationTrigger::Walk => "walk".to_string(),
        AnimationTrigger::Custom(s) => s.clone(),
    }
}

/// Convert snake_case to PascalCase
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
