/// Standalone binary to rebuild particle caches and regenerate TypeScript data
///
/// Usage: cargo run --bin rebuild_particle_cache
use weaverbird_lib::util::particle_cache;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        println!("Usage: cargo run --bin rebuild_particle_cache [--full]");
        println!();
        println!("  --full    Re-decompile Minecraft JAR before rebuilding caches");
        return;
    }

    let env_full = std::env::var("NPM_CONFIG_FULL")
        .or_else(|_| std::env::var("npm_config_full"))
        .ok()
        .map(|value| {
            let normalized = value.trim().to_ascii_lowercase();
            normalized == "1" || normalized == "true" || normalized == "yes"
        })
        .unwrap_or(false);
    let full = args.iter().any(|arg| arg == "--full") || env_full;

    if full {
        println!("[rebuild_particle_cache] Full rebuild (re-decompile enabled)...");
    } else {
        println!("[rebuild_particle_cache] Rebuilding particle caches (reuse decompiled sources)...");
    }
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
    let result = runtime.block_on(particle_cache::rebuild_particle_typescript(
        &version,
        &jar_path,
        &output_path,
        full,
    ));

    match result {
        Ok(data) => {
            println!("✓ Rebuilt particle caches and generated TypeScript");
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
            eprintln!("✗ Failed to rebuild particle cache: {}", err);
            std::process::exit(1);
        }
    }
}
