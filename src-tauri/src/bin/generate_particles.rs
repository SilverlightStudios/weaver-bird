/// Standalone binary to generate TypeScript particle data from cached extractions
///
/// Usage: cargo run --bin generate_particles
use weaverbird_lib::util::particle_cache;

fn main() {
    println!("Generating TypeScript particle data from cached extractions...");
    println!();

    let version = match particle_cache::resolve_cached_version() {
        Ok(version) => version,
        Err(err) => {
            eprintln!("✗ {}", err);
            std::process::exit(1);
        }
    };

    let jar_path = match particle_cache::resolve_jar_path(&version) {
        Ok(path) => path,
        Err(err) => {
            eprintln!("✗ Failed to resolve Minecraft JAR path: {}", err);
            std::process::exit(1);
        }
    };

    let output_path = match particle_cache::resolve_generated_ts_path() {
        Ok(path) => path,
        Err(err) => {
            eprintln!("✗ Failed to resolve output path: {}", err);
            std::process::exit(1);
        }
    };

    println!("Minecraft version: {}", version);
    println!("JAR path: {}", jar_path.display());
    println!("Output: {}", output_path.display());
    println!();

    let runtime = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    let result = runtime.block_on(particle_cache::ensure_particle_typescript(
        &version,
        &jar_path,
        &output_path,
    ));

    match result {
        Ok(data) => {
            println!("✓ Generated TypeScript particle data");
            println!("  Version: {}", data.version);
            println!(
                "  Physics: {} particles",
                data.physics.particles.len()
            );
            println!(
                "  Emissions: {} blocks, {} entities",
                data.emissions.blocks.len(),
                data.emissions.entities.len()
            );
            println!(
                "  Textures: {} particle mappings",
                data.textures.particles.len()
            );
        }
        Err(err) => {
            eprintln!("✗ Failed to generate particle data: {}", err);
            std::process::exit(1);
        }
    }
}
