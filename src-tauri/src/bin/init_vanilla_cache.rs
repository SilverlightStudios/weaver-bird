use weaverbird_lib::util::vanilla_textures;

fn main() {
    println!("[init_vanilla_cache] Initializing vanilla textures...");

    match vanilla_textures::initialize_vanilla_textures() {
        Ok(cache_dir) => {
            println!(
                "[init_vanilla_cache] Vanilla cache ready at: {}",
                cache_dir.display()
            );
        }
        Err(err) => {
            eprintln!("[init_vanilla_cache] Failed to initialize: {err}");
            std::process::exit(1);
        }
    }
}
