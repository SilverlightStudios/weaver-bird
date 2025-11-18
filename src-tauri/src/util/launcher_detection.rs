/// Utilities for detecting Minecraft launchers and their installation directories
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Supported Minecraft launcher types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LauncherType {
    #[serde(rename = "official")]
    Official,
    #[serde(rename = "modrinth")]
    Modrinth,
    #[serde(rename = "curseforge")]
    CurseForge,
    #[serde(rename = "prism")]
    PrismLauncher,
    #[serde(rename = "multimc")]
    MultiMC,
    #[serde(rename = "atlauncher")]
    ATLauncher,
    #[serde(rename = "gdlauncher")]
    GDLauncher,
    #[serde(rename = "technic")]
    Technic,
    #[serde(rename = "custom")]
    Custom,
}

impl LauncherType {
    /// Get the display name for this launcher
    pub fn display_name(&self) -> &str {
        match self {
            LauncherType::Official => "Minecraft (Official Launcher)",
            LauncherType::Modrinth => "Modrinth App",
            LauncherType::CurseForge => "CurseForge",
            LauncherType::PrismLauncher => "Prism Launcher",
            LauncherType::MultiMC => "MultiMC",
            LauncherType::ATLauncher => "ATLauncher",
            LauncherType::GDLauncher => "GDLauncher",
            LauncherType::Technic => "Technic Launcher",
            LauncherType::Custom => "Custom Location",
        }
    }

    /// Get the icon identifier for this launcher (for frontend)
    pub fn icon(&self) -> &str {
        match self {
            LauncherType::Official => "minecraft",
            LauncherType::Modrinth => "modrinth",
            LauncherType::CurseForge => "curseforge",
            LauncherType::PrismLauncher => "prism",
            LauncherType::MultiMC => "multimc",
            LauncherType::ATLauncher => "atlauncher",
            LauncherType::GDLauncher => "gdlauncher",
            LauncherType::Technic => "technic",
            LauncherType::Custom => "folder",
        }
    }
}

/// Attempt to locate the platform launcher icon so the frontend can display the real branding.
pub fn get_launcher_icon_path(launcher_type: &LauncherType) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        return find_macos_launcher_icon(launcher_type);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = launcher_type;
        None
    }
}

#[cfg(target_os = "macos")]
fn find_macos_launcher_icon(launcher_type: &LauncherType) -> Option<String> {
    use std::ffi::OsStr;

    fn read_icon_from_bundle(bundle_path: &Path) -> Option<String> {
        let resources = bundle_path.join("Contents/Resources");
        if !resources.exists() {
            return None;
        }
        let preferred = [
            "app.icns",
            "AppIcon.icns",
            "electron.icns",
            "Icon.icns",
            "icon.icns",
        ];
        for name in preferred {
            let candidate = resources.join(name);
            if candidate.exists() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
        if let Ok(entries) = fs::read_dir(&resources) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path
                    .extension()
                    .and_then(OsStr::to_str)
                    .map(|ext| ext.eq_ignore_ascii_case("icns"))
                    .unwrap_or(false)
                {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
        None
    }

    fn candidate_bundle_names(launcher: &LauncherType) -> &'static [&'static str] {
        match launcher {
            LauncherType::Official => &["Minecraft.app", "Minecraft Launcher.app"],
            LauncherType::Modrinth => &["Modrinth App.app", "Modrinth.app"],
            LauncherType::CurseForge => &["CurseForge.app"],
            LauncherType::PrismLauncher => &["Prism Launcher.app"],
            LauncherType::MultiMC => &["MultiMC.app"],
            LauncherType::ATLauncher => &["ATLauncher.app"],
            LauncherType::GDLauncher => &["GDLauncher.app", "GDLauncher Next.app"],
            LauncherType::Technic => &["Technic Launcher.app", "TechnicLauncher.app"],
            LauncherType::Custom => &[],
        }
    }

    let mut search_roots = vec![PathBuf::from("/Applications")];
    if let Ok(home) = std::env::var("HOME") {
        search_roots.push(PathBuf::from(&home).join("Applications"));
    }

    for root in search_roots {
        for bundle in candidate_bundle_names(launcher_type) {
            let bundle_path = root.join(bundle);
            if bundle_path.exists() {
                if let Some(icon_path) = read_icon_from_bundle(&bundle_path) {
                    // Convert .icns to PNG for browser compatibility
                    if icon_path.ends_with(".icns") {
                        if let Some(png_path) = convert_icns_to_png(&icon_path) {
                            return Some(png_path);
                        }
                    }
                    return Some(icon_path);
                }
            }
        }
    }

    None
}

/// Convert an .icns file to PNG and cache it
/// Returns the path to the cached PNG file
#[cfg(target_os = "macos")]
fn convert_icns_to_png(icns_path: &str) -> Option<String> {
    use std::io::BufReader;

    // Create cache directory for converted icons
    let cache_dir = dirs::cache_dir()?.join("weaverbird").join("launcher_icons");
    if let Err(e) = fs::create_dir_all(&cache_dir) {
        println!("[convert_icns_to_png] Failed to create cache dir: {}", e);
        return None;
    }

    // Generate cache file name from the icns path
    let icns_path_buf = PathBuf::from(icns_path);
    let file_name = icns_path_buf.file_name()?.to_string_lossy();
    let cache_file = cache_dir.join(format!("{}.png", file_name.trim_end_matches(".icns")));

    // Return cached file if it exists and is newer than the source
    if cache_file.exists() {
        if let (Ok(cache_meta), Ok(source_meta)) =
            (fs::metadata(&cache_file), fs::metadata(icns_path))
        {
            if let (Ok(cache_time), Ok(source_time)) =
                (cache_meta.modified(), source_meta.modified())
            {
                if cache_time >= source_time {
                    println!("[convert_icns_to_png] Using cached PNG: {:?}", cache_file);
                    return Some(cache_file.to_string_lossy().to_string());
                }
            }
        }
    }

    // Read the .icns file
    println!("[convert_icns_to_png] Converting {} to PNG", icns_path);
    let file = fs::File::open(icns_path).ok()?;
    let icon_family = icns::IconFamily::read(BufReader::new(file)).ok()?;

    // Try to get the largest available icon (usually 512x512 or 256x256)
    let icon_types = [
        icns::IconType::RGBA32_512x512_2x,
        icns::IconType::RGBA32_512x512,
        icns::IconType::RGBA32_256x256_2x,
        icns::IconType::RGBA32_256x256,
        icns::IconType::RGB24_128x128,
        icns::IconType::RGB24_48x48,
    ];

    for icon_type in &icon_types {
        if let Ok(image) = icon_family.get_icon_with_type(*icon_type) {
            // Write the PNG to cache
            if let Ok(file) = fs::File::create(&cache_file) {
                if image.write_png(file).is_ok() {
                    println!("[convert_icns_to_png] Created PNG: {:?}", cache_file);
                    return Some(cache_file.to_string_lossy().to_string());
                }
            }
        }
    }

    println!("[convert_icns_to_png] Failed to extract any image from ICNS");
    None
}

/// Information about a detected Minecraft launcher installation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherInfo {
    /// Type of launcher
    pub launcher_type: LauncherType,
    /// Display name
    pub name: String,
    /// Path to the .minecraft directory (or equivalent)
    pub minecraft_dir: String,
    /// Whether this installation was actually found on the system
    pub found: bool,
    /// Icon identifier for frontend
    pub icon: String,
    /// Optional path to a platform-provided icon asset
    pub icon_path: Option<String>,
}

/// Detect the official Minecraft launcher installation
#[cfg(target_os = "macos")]
fn detect_official_launcher() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join("Library/Application Support/minecraft");
        if path.exists() && path.join("versions").exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_official_launcher() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = PathBuf::from(appdata).join(".minecraft");
        if path.exists() && path.join("versions").exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_official_launcher() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join(".minecraft");
        if path.exists() && path.join("versions").exists() {
            return Some(path);
        }
    }
    None
}

/// Detect Modrinth App installation
#[cfg(target_os = "macos")]
fn detect_modrinth() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let paths = vec![
            PathBuf::from(&home).join("Library/Application Support/com.modrinth.theseus/profiles"),
            PathBuf::from(&home).join("Library/Application Support/ModrinthApp/profiles"),
        ];
        for path in paths {
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_modrinth() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let paths = vec![
            PathBuf::from(&appdata).join("com.modrinth.theseus/profiles"),
            PathBuf::from(&appdata).join("ModrinthApp/profiles"),
        ];
        for path in paths {
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_modrinth() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let paths = vec![
            PathBuf::from(&home).join(".local/share/com.modrinth.theseus/profiles"),
            PathBuf::from(&home).join(".config/ModrinthApp/profiles"),
        ];
        for path in paths {
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

/// Detect CurseForge launcher installation
#[cfg(target_os = "macos")]
fn detect_curseforge() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path =
            PathBuf::from(home).join("Library/Application Support/curseforge/minecraft/Install");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_curseforge() -> Option<PathBuf> {
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        let paths = vec![
            PathBuf::from(&userprofile).join("curseforge/minecraft/Install"),
            PathBuf::from(&userprofile).join("Documents/curseforge/minecraft/Install"),
        ];
        for path in paths {
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_curseforge() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join(".local/share/curseforge/minecraft/Install");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Detect Prism Launcher installation
#[cfg(target_os = "macos")]
fn detect_prism() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join("Library/Application Support/PrismLauncher/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_prism() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = PathBuf::from(appdata).join("PrismLauncher/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_prism() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let paths = vec![
            PathBuf::from(&home).join(".local/share/PrismLauncher/instances"),
            PathBuf::from(&home).join(".local/share/prismlauncher/instances"),
        ];
        for path in paths {
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

/// Detect MultiMC installation
#[cfg(target_os = "macos")]
fn detect_multimc() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join("Library/Application Support/MultiMC/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_multimc() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = PathBuf::from(appdata).join("MultiMC/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_multimc() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join(".local/share/multimc/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Detect ATLauncher installation
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn detect_atlauncher() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join("ATLauncher/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_atlauncher() -> Option<PathBuf> {
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        let path = PathBuf::from(userprofile).join("ATLauncher/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Detect GDLauncher installation
#[cfg(target_os = "macos")]
fn detect_gdlauncher() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path =
            PathBuf::from(home).join("Library/Application Support/gdlauncher_next/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn detect_gdlauncher() -> Option<PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = PathBuf::from(appdata).join("gdlauncher_next/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn detect_gdlauncher() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join(".local/share/gdlauncher_next/instances");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Detect all Minecraft launchers on the system
pub fn detect_all_launchers() -> Vec<LauncherInfo> {
    let mut launchers = Vec::new();

    // Official Launcher
    if let Some(path) = detect_official_launcher() {
        let launcher_type = LauncherType::Official;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // Modrinth
    if let Some(path) = detect_modrinth() {
        let launcher_type = LauncherType::Modrinth;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // CurseForge
    if let Some(path) = detect_curseforge() {
        let launcher_type = LauncherType::CurseForge;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // Prism Launcher
    if let Some(path) = detect_prism() {
        let launcher_type = LauncherType::PrismLauncher;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // MultiMC
    if let Some(path) = detect_multimc() {
        let launcher_type = LauncherType::MultiMC;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // ATLauncher
    if let Some(path) = detect_atlauncher() {
        let launcher_type = LauncherType::ATLauncher;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    // GDLauncher
    if let Some(path) = detect_gdlauncher() {
        let launcher_type = LauncherType::GDLauncher;
        launchers.push(LauncherInfo {
            launcher_type: launcher_type.clone(),
            name: launcher_type.display_name().to_string(),
            minecraft_dir: path.to_string_lossy().to_string(),
            found: true,
            icon: launcher_type.icon().to_string(),
            icon_path: get_launcher_icon_path(&launcher_type),
        });
    }

    launchers
}

/// Identify the launcher type from a given directory path
pub fn identify_launcher_from_path(path: &Path) -> Result<LauncherType> {
    let path_str = path.to_string_lossy().to_lowercase();

    if path_str.contains("modrinth") || path_str.contains("theseus") {
        Ok(LauncherType::Modrinth)
    } else if path_str.contains("curseforge") {
        Ok(LauncherType::CurseForge)
    } else if path_str.contains("prism") {
        Ok(LauncherType::PrismLauncher)
    } else if path_str.contains("multimc") {
        Ok(LauncherType::MultiMC)
    } else if path_str.contains("atlauncher") {
        Ok(LauncherType::ATLauncher)
    } else if path_str.contains("gdlauncher") {
        Ok(LauncherType::GDLauncher)
    } else if path_str.contains(".minecraft") || path.join("versions").exists() {
        Ok(LauncherType::Official)
    } else {
        Ok(LauncherType::Custom)
    }
}

/// Validate that a path looks like a valid Minecraft installation
pub fn validate_minecraft_directory(path: &Path) -> Result<bool> {
    // Check for versions directory (official launcher style)
    if path.join("versions").exists() {
        return Ok(true);
    }

    // Check for instances directory (multi-instance launchers)
    if path.join("instances").exists() {
        return Ok(true);
    }

    // Check for profiles directory (Modrinth)
    if path.file_name().and_then(|n| n.to_str()) == Some("profiles") {
        return Ok(true);
    }

    Ok(false)
}

/// Get the resourcepacks directory for a launcher
pub fn get_resourcepacks_dir(launcher_dir: &Path, launcher_type: &LauncherType) -> Result<PathBuf> {
    match launcher_type {
        LauncherType::Official => {
            // Official launcher: <minecraft_dir>/resourcepacks
            Ok(launcher_dir.join("resourcepacks"))
        }
        LauncherType::Modrinth
        | LauncherType::PrismLauncher
        | LauncherType::MultiMC
        | LauncherType::ATLauncher
        | LauncherType::GDLauncher => {
            // Multi-instance launchers: just return the base dir
            // User will need to select the specific instance
            Ok(launcher_dir.to_path_buf())
        }
        LauncherType::CurseForge => {
            // CurseForge Install directory
            Ok(launcher_dir.to_path_buf())
        }
        LauncherType::Technic | LauncherType::Custom => {
            // For custom/technic, try to find resourcepacks folder
            let resourcepacks = launcher_dir.join("resourcepacks");
            if resourcepacks.exists() {
                Ok(resourcepacks)
            } else {
                Ok(launcher_dir.to_path_buf())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_launchers() {
        let launchers = detect_all_launchers();
        println!("Found {} launcher(s)", launchers.len());
        for launcher in &launchers {
            println!("  - {}: {}", launcher.name, launcher.minecraft_dir);
        }
        // Test should at least not crash
        assert!(launchers.len() >= 0);
    }

    #[test]
    fn test_launcher_display_names() {
        assert_eq!(
            LauncherType::Official.display_name(),
            "Minecraft (Official Launcher)"
        );
        assert_eq!(LauncherType::Modrinth.display_name(), "Modrinth App");
        assert_eq!(LauncherType::CurseForge.display_name(), "CurseForge");
        assert_eq!(LauncherType::PrismLauncher.display_name(), "Prism Launcher");
        assert_eq!(LauncherType::MultiMC.display_name(), "MultiMC");
        assert_eq!(LauncherType::ATLauncher.display_name(), "ATLauncher");
        assert_eq!(LauncherType::GDLauncher.display_name(), "GDLauncher");
        assert_eq!(LauncherType::Technic.display_name(), "Technic Launcher");
        assert_eq!(LauncherType::Custom.display_name(), "Custom Location");
    }

    #[test]
    fn test_launcher_icons() {
        assert_eq!(LauncherType::Official.icon(), "minecraft");
        assert_eq!(LauncherType::Modrinth.icon(), "modrinth");
        assert_eq!(LauncherType::CurseForge.icon(), "curseforge");
        assert_eq!(LauncherType::PrismLauncher.icon(), "prism");
        assert_eq!(LauncherType::MultiMC.icon(), "multimc");
        assert_eq!(LauncherType::ATLauncher.icon(), "atlauncher");
        assert_eq!(LauncherType::GDLauncher.icon(), "gdlauncher");
        assert_eq!(LauncherType::Technic.icon(), "technic");
        assert_eq!(LauncherType::Custom.icon(), "folder");
    }

    #[test]
    fn test_identify_launcher_from_path_official() {
        let path = Path::new("/home/user/.minecraft");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        // Could be Official or Custom depending on whether versions dir exists
        assert!(matches!(result.unwrap(), LauncherType::Official | LauncherType::Custom));
    }

    #[test]
    fn test_identify_launcher_from_path_modrinth() {
        let path = Path::new("/home/user/modrinth/profiles");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::Modrinth);
    }

    #[test]
    fn test_identify_launcher_from_path_modrinth_theseus() {
        let path = Path::new("/home/user/com.modrinth.theseus/profiles");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::Modrinth);
    }

    #[test]
    fn test_identify_launcher_from_path_curseforge() {
        let path = Path::new("/home/user/curseforge/minecraft/Install");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::CurseForge);
    }

    #[test]
    fn test_identify_launcher_from_path_prism() {
        let path = Path::new("/home/user/PrismLauncher/instances");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::PrismLauncher);
    }

    #[test]
    fn test_identify_launcher_from_path_multimc() {
        let path = Path::new("/home/user/MultiMC/instances");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::MultiMC);
    }

    #[test]
    fn test_identify_launcher_from_path_atlauncher() {
        let path = Path::new("/home/user/ATLauncher/instances");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::ATLauncher);
    }

    #[test]
    fn test_identify_launcher_from_path_gdlauncher() {
        let path = Path::new("/home/user/gdlauncher_next/instances");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::GDLauncher);
    }

    #[test]
    fn test_identify_launcher_from_path_custom() {
        let path = Path::new("/some/random/path");
        let result = identify_launcher_from_path(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), LauncherType::Custom);
    }

    #[test]
    fn test_validate_minecraft_directory_with_versions() {
        let temp_dir = std::env::temp_dir().join("test_mc_versions");
        let versions_dir = temp_dir.join("versions");
        std::fs::create_dir_all(&versions_dir).expect("Failed to create test directory");

        let result = validate_minecraft_directory(&temp_dir);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    #[test]
    fn test_validate_minecraft_directory_with_instances() {
        let temp_dir = std::env::temp_dir().join("test_mc_instances");
        let instances_dir = temp_dir.join("instances");
        std::fs::create_dir_all(&instances_dir).expect("Failed to create test directory");

        let result = validate_minecraft_directory(&temp_dir);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    #[test]
    fn test_validate_minecraft_directory_profiles() {
        let temp_dir = std::env::temp_dir().join("test_mc_parent");
        let profiles_dir = temp_dir.join("profiles");
        std::fs::create_dir_all(&profiles_dir).expect("Failed to create test directory");

        let result = validate_minecraft_directory(&profiles_dir);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), true);
    }

    #[test]
    fn test_validate_minecraft_directory_invalid() {
        let temp_dir = std::env::temp_dir().join("test_mc_invalid");
        std::fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let result = validate_minecraft_directory(&temp_dir);

        // Clean up
        std::fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    #[test]
    fn test_get_resourcepacks_dir_official() {
        let launcher_dir = Path::new("/home/user/.minecraft");
        let result = get_resourcepacks_dir(launcher_dir, &LauncherType::Official);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), launcher_dir.join("resourcepacks"));
    }

    #[test]
    fn test_get_resourcepacks_dir_modrinth() {
        let launcher_dir = Path::new("/home/user/modrinth/profiles");
        let result = get_resourcepacks_dir(launcher_dir, &LauncherType::Modrinth);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), launcher_dir);
    }

    #[test]
    fn test_get_resourcepacks_dir_prism() {
        let launcher_dir = Path::new("/home/user/PrismLauncher/instances");
        let result = get_resourcepacks_dir(launcher_dir, &LauncherType::PrismLauncher);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), launcher_dir);
    }

    #[test]
    fn test_get_resourcepacks_dir_curseforge() {
        let launcher_dir = Path::new("/home/user/curseforge/minecraft/Install");
        let result = get_resourcepacks_dir(launcher_dir, &LauncherType::CurseForge);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), launcher_dir);
    }

    #[test]
    fn test_get_resourcepacks_dir_custom_with_resourcepacks() {
        let temp_dir = std::env::temp_dir().join("test_custom_mc");
        let resourcepacks_dir = temp_dir.join("resourcepacks");
        std::fs::create_dir_all(&resourcepacks_dir).expect("Failed to create test directory");

        let result = get_resourcepacks_dir(&temp_dir, &LauncherType::Custom);

        // Clean up
        std::fs::remove_dir_all(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), resourcepacks_dir);
    }

    #[test]
    fn test_get_resourcepacks_dir_custom_without_resourcepacks() {
        let temp_dir = std::env::temp_dir().join("test_custom_mc_no_rp");
        std::fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

        let result = get_resourcepacks_dir(&temp_dir, &LauncherType::Custom);

        // Clean up
        std::fs::remove_dir(&temp_dir).ok();

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), temp_dir);
    }

    #[test]
    fn test_launcher_type_serialization() {
        let launcher_type = LauncherType::Official;
        let json = serde_json::to_string(&launcher_type).expect("should serialize");
        assert_eq!(json, "\"official\"");

        let deserialized: LauncherType = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized, LauncherType::Official);
    }

    #[test]
    fn test_launcher_type_all_variants_serialize() {
        let variants = vec![
            (LauncherType::Official, "\"official\""),
            (LauncherType::Modrinth, "\"modrinth\""),
            (LauncherType::CurseForge, "\"curseforge\""),
            (LauncherType::PrismLauncher, "\"prism\""),
            (LauncherType::MultiMC, "\"multimc\""),
            (LauncherType::ATLauncher, "\"atlauncher\""),
            (LauncherType::GDLauncher, "\"gdlauncher\""),
            (LauncherType::Technic, "\"technic\""),
            (LauncherType::Custom, "\"custom\""),
        ];

        for (launcher_type, expected_json) in variants {
            let json = serde_json::to_string(&launcher_type).expect("should serialize");
            assert_eq!(json, expected_json);

            let deserialized: LauncherType = serde_json::from_str(&json).expect("should deserialize");
            assert_eq!(deserialized, launcher_type);
        }
    }

    #[test]
    fn test_launcher_info_serialization() {
        let info = LauncherInfo {
            launcher_type: LauncherType::Modrinth,
            name: "Modrinth App".to_string(),
            minecraft_dir: "/home/user/modrinth".to_string(),
            found: true,
            icon: "modrinth".to_string(),
            icon_path: Some("/Applications/Modrinth.app/icon.png".to_string()),
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        let deserialized: LauncherInfo = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.launcher_type, LauncherType::Modrinth);
        assert_eq!(deserialized.name, "Modrinth App");
        assert_eq!(deserialized.minecraft_dir, "/home/user/modrinth");
        assert_eq!(deserialized.found, true);
        assert_eq!(deserialized.icon, "modrinth");
        assert_eq!(deserialized.icon_path, Some("/Applications/Modrinth.app/icon.png".to_string()));
    }

    #[test]
    fn test_launcher_type_clone() {
        let launcher1 = LauncherType::PrismLauncher;
        let launcher2 = launcher1.clone();
        assert_eq!(launcher1, launcher2);
    }

    #[test]
    fn test_launcher_info_clone() {
        let info1 = LauncherInfo {
            launcher_type: LauncherType::Official,
            name: "Minecraft".to_string(),
            minecraft_dir: "/home/user/.minecraft".to_string(),
            found: true,
            icon: "minecraft".to_string(),
            icon_path: None,
        };

        let info2 = info1.clone();
        assert_eq!(info1.launcher_type, info2.launcher_type);
        assert_eq!(info1.name, info2.name);
        assert_eq!(info1.minecraft_dir, info2.minecraft_dir);
    }
}
