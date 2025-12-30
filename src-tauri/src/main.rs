#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use weaverbird_lib::commands::{
    build_weaver_nest_impl, check_minecraft_installed_impl, detect_launchers_impl,
    get_block_state_schema_impl, get_cached_vanilla_version_impl, get_colormap_path_impl,
    get_default_packs_dir_impl, get_entity_version_variants_impl,
    get_launcher_resourcepacks_dir_impl, get_pack_texture_path_impl,
    get_suggested_minecraft_paths_impl, get_vanilla_mcmeta_path_impl,
    get_vanilla_texture_path_impl, identify_launcher_impl,
    initialize_vanilla_textures_from_custom_dir_impl, initialize_vanilla_textures_impl,
    list_available_minecraft_versions_impl, load_model_json_impl, read_block_model_impl,
    read_pack_file_impl, read_vanilla_jem_impl, resolve_block_state_impl, scan_packs_folder_impl,
    set_vanilla_texture_version_impl, BuildWeaverNestRequest,
};

/// Tauri command wrapper for scanning resource packs (async for non-blocking UI)
#[tauri::command]
async fn scan_packs_folder(
    packs_dir: String,
) -> Result<weaverbird_lib::model::ScanResult, weaverbird_lib::AppError> {
    // Use spawn_blocking for CPU/IO-heavy work with rayon parallelism
    tokio::task::spawn_blocking(move || scan_packs_folder_impl(packs_dir))
        .await
        .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for building Weaver Nest (async for non-blocking UI)
#[tauri::command]
async fn build_weaver_nest(
    request: BuildWeaverNestRequest,
) -> Result<String, weaverbird_lib::AppError> {
    // Use spawn_blocking for CPU/IO-heavy work with rayon parallelism
    tokio::task::spawn_blocking(move || build_weaver_nest_impl(request))
        .await
        .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for getting default packs directory
#[tauri::command]
fn get_default_packs_dir() -> Result<String, weaverbird_lib::AppError> {
    get_default_packs_dir_impl()
}

/// Tauri command wrapper for initializing vanilla textures (async for non-blocking UI)
#[tauri::command]
async fn initialize_vanilla_textures(
    window: tauri::Window,
) -> Result<String, weaverbird_lib::AppError> {
    // Use spawn_blocking for CPU/IO-heavy vanilla texture extraction
    tokio::task::spawn_blocking(move || initialize_vanilla_textures_impl(window))
        .await
        .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for getting vanilla texture path
#[tauri::command]
fn get_vanilla_texture_path(asset_id: String) -> Result<String, weaverbird_lib::AppError> {
    get_vanilla_texture_path_impl(asset_id)
}

/// Tauri command wrapper for getting vanilla .mcmeta path
#[tauri::command]
fn get_vanilla_mcmeta_path(asset_id: String) -> Result<Option<String>, weaverbird_lib::AppError> {
    get_vanilla_mcmeta_path_impl(asset_id)
}

/// Tauri command wrapper for getting colormap path
#[tauri::command]
fn get_colormap_path(colormap_type: String) -> Result<String, weaverbird_lib::AppError> {
    get_colormap_path_impl(colormap_type)
}

/// Tauri command wrapper for checking Minecraft installation
#[tauri::command]
fn check_minecraft_installed() -> Result<bool, weaverbird_lib::AppError> {
    check_minecraft_installed_impl()
}

/// Tauri command wrapper for getting suggested Minecraft paths
#[tauri::command]
fn get_suggested_minecraft_paths() -> Result<Vec<String>, weaverbird_lib::AppError> {
    get_suggested_minecraft_paths_impl()
}

/// Tauri command wrapper for initializing vanilla textures from custom directory (async)
#[tauri::command]
async fn initialize_vanilla_textures_from_custom_dir(
    minecraft_dir: String,
) -> Result<String, weaverbird_lib::AppError> {
    // Use spawn_blocking for CPU/IO-heavy vanilla texture extraction
    tokio::task::spawn_blocking(move || {
        initialize_vanilla_textures_from_custom_dir_impl(minecraft_dir)
    })
    .await
    .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for listing available Minecraft versions
#[tauri::command]
fn list_available_minecraft_versions(
) -> Result<Vec<weaverbird_lib::util::vanilla_textures::MinecraftVersion>, weaverbird_lib::AppError>
{
    list_available_minecraft_versions_impl()
}

/// Tauri command wrapper for getting cached vanilla texture version
#[tauri::command]
fn get_cached_vanilla_version() -> Result<Option<String>, weaverbird_lib::AppError> {
    get_cached_vanilla_version_impl()
}

/// Tauri command wrapper for setting vanilla texture version (async for non-blocking UI)
#[tauri::command]
async fn set_vanilla_texture_version(
    version: String,
    window: tauri::Window,
) -> Result<String, weaverbird_lib::AppError> {
    // Use spawn_blocking for CPU/IO-heavy vanilla texture extraction
    tokio::task::spawn_blocking(move || set_vanilla_texture_version_impl(version, window))
        .await
        .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for detecting all launchers
#[tauri::command]
fn detect_launchers(
) -> Result<Vec<weaverbird_lib::util::launcher_detection::LauncherInfo>, weaverbird_lib::AppError> {
    detect_launchers_impl()
}

/// Tauri command wrapper for identifying launcher from path
#[tauri::command]
fn identify_launcher(
    path: String,
) -> Result<weaverbird_lib::util::launcher_detection::LauncherInfo, weaverbird_lib::AppError> {
    identify_launcher_impl(path)
}

/// Tauri command wrapper for getting launcher resourcepacks directory
#[tauri::command]
fn get_launcher_resourcepacks_dir(
    launcher_info: weaverbird_lib::util::launcher_detection::LauncherInfo,
) -> Result<String, weaverbird_lib::AppError> {
    get_launcher_resourcepacks_dir_impl(launcher_info)
}

/// Tauri command wrapper for getting pack texture path
#[tauri::command]
fn get_pack_texture_path(
    app_handle: tauri::AppHandle,
    pack_path: String,
    asset_id: String,
    is_zip: bool,
    version_folders: Option<Vec<String>>,
) -> Result<String, weaverbird_lib::AppError> {
    get_pack_texture_path_impl(pack_path, asset_id, is_zip, version_folders, &app_handle)
}

/// Tauri command wrapper for reading block model JSON (legacy - goes through blockstate resolution)
#[tauri::command]
fn read_block_model(
    pack_id: String,
    model_id: String,
    packs_dir: String,
) -> Result<weaverbird_lib::util::block_models::BlockModel, weaverbird_lib::AppError> {
    read_block_model_impl(pack_id, model_id, packs_dir)
}

/// Tauri command wrapper for reading any file from a pack (directory or ZIP)
/// Used for loading JEM files from __mocks__/cem/ or resource packs
#[tauri::command]
fn read_pack_file(
    pack_path: String,
    file_path: String,
    is_zip: bool,
) -> Result<String, weaverbird_lib::AppError> {
    read_pack_file_impl(pack_path, file_path, is_zip)
}

/// Tauri command wrapper for reading vanilla JEM files from __mocks__/cem/
#[tauri::command]
fn read_vanilla_jem(entity_type: String) -> Result<String, weaverbird_lib::AppError> {
    read_vanilla_jem_impl(entity_type)
}

/// Tauri command wrapper for loading model JSON directly by model ID
#[tauri::command]
fn load_model_json(
    pack_id: String,
    model_id: String,
    packs_dir: String,
) -> Result<weaverbird_lib::util::block_models::BlockModel, weaverbird_lib::AppError> {
    load_model_json_impl(pack_id, model_id, packs_dir)
}

/// Tauri command wrapper for getting block state schema
#[tauri::command]
fn get_block_state_schema(
    pack_id: String,
    block_id: String,
    packs_dir: String,
) -> Result<weaverbird_lib::util::blockstates::BlockStateSchema, weaverbird_lib::AppError> {
    get_block_state_schema_impl(pack_id, block_id, packs_dir)
}

/// Tauri command wrapper for resolving block state to models (async for non-blocking)
#[tauri::command]
async fn resolve_block_state(
    pack_id: String,
    block_id: String,
    packs_dir: String,
    state_props: Option<std::collections::HashMap<String, String>>,
    seed: Option<u64>,
) -> Result<weaverbird_lib::util::blockstates::ResolutionResult, weaverbird_lib::AppError> {
    // Use spawn_blocking for potentially recursive model resolution
    tokio::task::spawn_blocking(move || {
        resolve_block_state_impl(pack_id, block_id, packs_dir, state_props, seed)
    })
    .await
    .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

/// Tauri command wrapper for getting entity version variants (async for non-blocking)
#[tauri::command]
async fn get_entity_version_variants(
    packs_dir: String,
) -> Result<std::collections::HashMap<String, Vec<String>>, weaverbird_lib::AppError> {
    // Use spawn_blocking for I/O-heavy pack scanning
    tokio::task::spawn_blocking(move || get_entity_version_variants_impl(packs_dir))
        .await
        .map_err(|e| weaverbird_lib::AppError::internal("Task join error", format!("{}", e)))?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::{
                    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
                    Emitter, Manager,
                };

                // Create menu items
                let settings = MenuItemBuilder::with_id("settings", "Settings...")
                    .accelerator("Cmd+,")
                    .build(app)?;

                let quit = MenuItemBuilder::with_id("quit", "Quit")
                    .accelerator("Cmd+Q")
                    .build(app)?;

                // Create app submenu
                let app_submenu = SubmenuBuilder::new(app, "Weaverbird")
                    .item(&settings)
                    .separator()
                    .item(&quit)
                    .build()?;

                // Build the main menu
                let menu = MenuBuilder::new(app).items(&[&app_submenu]).build()?;

                app.set_menu(menu)?;

                // Handle menu events
                app.on_menu_event(move |app, event| {
                    if event.id() == "settings" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open-settings", ());
                        }
                    } else if event.id() == "quit" {
                        app.exit(0);
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_packs_folder,
            build_weaver_nest,
            get_default_packs_dir,
            initialize_vanilla_textures,
            get_vanilla_texture_path,
            get_vanilla_mcmeta_path,
            get_colormap_path,
            check_minecraft_installed,
            get_suggested_minecraft_paths,
            initialize_vanilla_textures_from_custom_dir,
            list_available_minecraft_versions,
            get_cached_vanilla_version,
            set_vanilla_texture_version,
            detect_launchers,
            identify_launcher,
            get_launcher_resourcepacks_dir,
            get_pack_texture_path,
            read_block_model,
            read_pack_file,
            read_vanilla_jem,
            load_model_json,
            get_block_state_schema,
            resolve_block_state,
            get_entity_version_variants
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
