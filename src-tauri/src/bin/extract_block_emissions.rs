/**
 * Standalone binary to extract block particle emissions from Minecraft JAR
 *
 * Usage: cargo run --bin extract_block_emissions
 *
 * This will:
 * 1. Load the cached vanilla version info
 * 2. Extract block emissions from the JAR file
 * 3. Cache the results for use by the app and TypeScript generation
 */

use weaverbird_lib::commands::extract_block_emissions_impl;
use weaverbird_lib::commands::get_cached_vanilla_version_impl;

fn main() {
    println!("[extract_block_emissions] Starting extraction...");

    // Get cached vanilla version
    let version = match get_cached_vanilla_version_impl() {
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

    println!("[extract_block_emissions] Extracting for Minecraft {}", version);

    // Create tokio runtime for async operation
    let runtime = tokio::runtime::Runtime::new().unwrap();

    // Extract (will use cache if available, or extract if not)
    let emissions = match runtime.block_on(extract_block_emissions_impl(version)) {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Error extracting block emissions: {}", e);
            std::process::exit(1);
        }
    };

    println!(
        "[extract_block_emissions] Successfully extracted {} blocks and {} entities",
        emissions.blocks.len(),
        emissions.entities.len()
    );

    // Print block names sorted alphabetically
    println!("\nBlocks:");
    let mut block_ids: Vec<&String> = emissions.blocks.keys().collect();
    block_ids.sort();
    for block_id in block_ids {
        let block_data = &emissions.blocks[block_id];
        println!(
            "  - {}: {} emissions",
            block_id,
            block_data.emissions.len()
        );
    }

    // Print entity names sorted alphabetically
    println!("\nEntities:");
    let mut entity_ids: Vec<&String> = emissions.entities.keys().collect();
    entity_ids.sort();
    for entity_id in entity_ids {
        let entity_data = &emissions.entities[entity_id];
        println!(
            "  - {}: {} emissions",
            entity_id,
            entity_data.emissions.len()
        );
    }

    println!("\n[extract_block_emissions] Done!");
}
