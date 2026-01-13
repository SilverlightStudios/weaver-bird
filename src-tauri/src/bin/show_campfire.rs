/**
 * Debug script to show decompiled CampfireBlock source
 */

use std::fs;
use std::path::{Path, PathBuf};
use weaverbird_lib::commands::get_cached_vanilla_version_impl;
use weaverbird_lib::util::vanilla_textures;
use weaverbird_lib::util::particle_physics_extractor::{ensure_cfr_available, download_mojang_mappings};
use std::process::Command;

fn decompile_campfire(jar_path: &Path, version: &str) -> anyhow::Result<PathBuf> {
    // Get CFR
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let cfr_path = runtime.block_on(ensure_cfr_available())?;

    // Get Mojang mappings
    let mappings_path = runtime.block_on(download_mojang_mappings(version))?;

    // Create output directory
    let output_dir = std::env::temp_dir().join(format!("minecraft_decompile_{}", version));
    fs::create_dir_all(&output_dir)?;

    println!("[show_campfire] Decompiling CampfireBlock...");
    println!("  CFR: {:?}", cfr_path);
    println!("  Mappings: {:?}", mappings_path);
    println!("  Output: {:?}", output_dir);

    // Decompile just CampfireBlock
    let output = Command::new("java")
        .args(&[
            "-jar",
            cfr_path.to_str().unwrap(),
            jar_path.to_str().unwrap(),
            "--outputdir",
            output_dir.to_str().unwrap(),
            "--obfuscationpath",
            mappings_path.to_str().unwrap(),
            "net.minecraft.world.level.block.CampfireBlock",
        ])
        .output()?;

    if !output.status.success() {
        eprintln!("CFR stderr: {}", String::from_utf8_lossy(&output.stderr));
    }

    Ok(output_dir)
}

fn main() {
    println!("[show_campfire] Getting Minecraft version...");

    let version = match get_cached_vanilla_version_impl() {
        Ok(Some(v)) => v,
        Ok(None) => {
            eprintln!("Error: No cached vanilla version found.");
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    };

    println!("[show_campfire] Version: {}", version);

    let versions = vanilla_textures::list_all_available_versions().unwrap();
    let version_info = versions.iter()
        .find(|v| v.version == version)
        .expect("Version not found");

    let jar_path = std::path::PathBuf::from(&version_info.jar_path);
    println!("[show_campfire] JAR: {:?}", jar_path);

    // Decompile
    let decompile_dir = decompile_campfire(&jar_path, &version).unwrap();

    // Read CampfireBlock
    let campfire_path = decompile_dir.join("net/minecraft/world/level/block/CampfireBlock.java");
    if let Ok(source) = fs::read_to_string(&campfire_path) {
        // Find and print animateTick method
        if let Some(start) = source.find("public void animateTick") {
            let method_source = &source[start..];
            if let Some(end) = method_source.find("\n    }\n\n") {
                println!("\n=== CampfireBlock.animateTick() ===\n");
                println!("{}\n", &method_source[..end + 7]);
            }
        }
    } else {
        eprintln!("Could not read CampfireBlock.java at {:?}", campfire_path);
    }
}
