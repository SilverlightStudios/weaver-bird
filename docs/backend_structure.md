# Weaverbird Backend Comprehensive Structure Analysis

## Project Overview
**Type:** Tauri Desktop Application (Rust Backend + React/TypeScript Frontend)
**Application:** Minecraft Resource Pack Manager
**Backend Language:** Rust
**Frontend Language:** TypeScript/React
**Total Backend Code:** ~4,982 lines of Rust code

## 1. Backend Location & Technology Stack

### Location
```
/home/user/weaver-bird/src-tauri/
├── src/                    # Main Rust source code
├── Cargo.toml             # Rust dependencies and configuration
├── Cargo.lock             # Dependency lock file
├── tauri.conf.json        # Tauri application configuration
├── build.rs               # Build script
└── icons/                 # Application icons
```

### Technology Stack
- **Language:** Rust (Edition 2021)
- **Minimum Rust Version:** 1.60
- **Framework:** Tauri v2.5 (Desktop application framework)
- **Key Dependencies:**
  - `tauri`: Core desktop framework
  - `serde/serde_json`: Serialization (JSON)
  - `walkdir`: Directory traversal
  - `zip`: ZIP file handling
  - `anyhow`: Error handling
  - `image/icns`: Image processing
  - `dirs`: Platform-specific directories
  - `rand/rand_chacha`: Random number generation

## 2. Backend Architecture & Module Organization

### Core Module Structure
```
src-tauri/src/
├── main.rs                    # Tauri command handlers (219 lines)
├── lib.rs                     # Library entry point and module exports
├── error.rs                   # Custom error types and handling (97 lines)
├── validation.rs              # Input validation utilities (96 lines)
├── model/
│   └── mod.rs                 # Data models (78 lines)
├── commands/
│   ├── mod.rs                 # Command module exports
│   └── packs.rs               # Main command implementations (869 lines)
└── util/                      # Utility modules (~2,500 lines)
    ├── mod.rs                 # Utility module exports
    ├── pack_scanner.rs        # Pack discovery and metadata (201 lines)
    ├── asset_indexer.rs       # Asset indexing and mapping (228 lines)
    ├── blockstates.rs         # Blockstate parsing/resolution (1,625 lines)
    ├── block_models.rs        # Block model loading/inheritance (395 lines)
    ├── texture_index.rs       # Texture-to-block mapping (178 lines)
    ├── vanilla_textures.rs    # Vanilla asset extraction (341 lines)
    ├── launcher_detection.rs  # Minecraft launcher detection (682 lines)
    ├── mc_paths.rs            # Platform-specific MC paths (67 lines)
    ├── weaver_nest.rs         # Pack optimization/building (139 lines)
    ├── texture_to_block_map.rs # Texture-block mapping (73 lines)
    └── zip.rs                 # ZIP file utilities (74 lines)
```

## 3. Main Backend Files & Their Purposes

### Entry Points

**main.rs** - Tauri Command Handlers (219 lines)
- Wraps all library implementations as Tauri commands
- Handles macOS menu integration
- Exposes 17 backend commands to frontend
- Minimal business logic - just wrappers around lib implementations

**lib.rs** - Library Entry Point (8 lines)
- Declares public modules: error, model, util, commands, validation
- Exports AppError and AppResult types
- Enables library usage independent of Tauri CLI

### Core Error Handling

**error.rs** - AppError Type (97 lines)
```rust
pub struct AppError {
    pub code: String,      // "VALIDATION_ERROR", "IO_ERROR", "SCAN_ERROR", etc.
    pub message: String,   // User-friendly message
    pub details: Option<String>,  // Technical details
}
```
- Implements modern Tauri v2 pattern for structured error responses
- Serializes to JSON automatically
- Error variants: validation, io, scan, build, internal
- Implements From traits for anyhow::Error, std::io::Error, serde_json::Error

### Input Validation

**validation.rs** - Validation Utilities (96 lines)
Key functions:
- `validate_directory()` - Check path exists and is readable
- `validate_pack_order()` - Ensure pack list not empty
- `validate_overrides()` - Validate override references
- `validate_build_request()` - Composite validation for build ops

### Data Models

**model/mod.rs** - Core Data Structures (78 lines)
- **PackMeta** - Resource pack metadata (id, name, path, size, is_zip, description, icon_data)
- **AssetRecord** - Individual asset with searchable labels and file locations
- **ScanResult** - Result of scanning packs directory (packs, assets, providers map)
- **OverrideSelection** - UI override for texture variants
- **Progress** - Progress tracking (not yet implemented)

### Command Implementations

**commands/packs.rs** - Main Backend Logic (869 lines)
17 implemented command handlers:

1. **scan_packs_folder_impl()** - Discover and index all packs
2. **build_weaver_nest_impl()** - Build optimized resource pack
3. **get_default_packs_dir_impl()** - Get platform default
4. **initialize_vanilla_textures_impl()** - Extract vanilla assets
5. **get_vanilla_texture_path_impl()** - Locate vanilla texture
6. **get_colormap_path_impl()** - Get grass/foliage colormap
7. **check_minecraft_installed_impl()** - Verify MC installation
8. **get_suggested_minecraft_paths_impl()** - List likely MC paths
9. **initialize_vanilla_textures_from_custom_dir_impl()** - Use custom MC directory
10. **detect_launchers_impl()** - Find all installed launchers
11. **identify_launcher_impl()** - Identify launcher from path
12. **get_launcher_resourcepacks_dir_impl()** - Get launcher's pack directory
13. **get_pack_texture_path_impl()** - Get texture from pack (handles ZIP extraction)
14. **read_block_model_impl()** - Load block model from texture ID
15. **load_model_json_impl()** - Load model directly by model ID
16. **get_block_state_schema_impl()** - Get blockstate properties for UI
17. **resolve_block_state_impl()** - Resolve blockstate to actual models

### Utility Modules

**pack_scanner.rs** (201 lines)
- `scan_packs()` - Discovers .zip packs and pack directories
- `extract_pack_metadata_from_zip()` - Reads pack.mcmeta and pack.png from ZIPs
- `extract_pack_metadata_from_dir()` - Reads pack.mcmeta and pack.png from folders
- `calculate_dir_size()` - Recursive directory size calculation

**asset_indexer.rs** (228 lines)
- `index_assets()` - Creates asset index from multiple packs
- `index_zip_pack()` - Indexes assets in ZIP files
- `index_folder_pack()` - Indexes assets in directories
- Builds provider mapping (which pack provides which asset)

**blockstates.rs** (1,625 lines) - MOST COMPLEX MODULE
- `Blockstate` struct - Models Minecraft blockstate JSON format
- `BlockstateVariant` - Single or multiple model references
- `MultipartCase` - For complex blocks with conditions
- `read_blockstate()` - Loads blockstate from pack/vanilla
- `resolve_blockstate()` - Resolves blockstate properties to model list
- `build_block_state_schema()` - Extracts UI-renderable properties
- `get_default_model()` - Gets default model from blockstate
- Extensive weighted random model selection logic
- Handles both variant and multipart blockstate formats

**block_models.rs** (395 lines)
- `BlockModel` struct - Parsed model JSON
- `resolve_block_model()` - Loads model with parent inheritance chain
- Handles vanilla fallback for missing parent models
- Supports display transformations and element definitions

**texture_index.rs** (178 lines)
- `TextureIndex` - Maps textures to blocks
- `build()` - Creates texture→block mappings
- `get_primary_block()` - Looks up block for texture

**vanilla_textures.rs** (341 lines)
- `initialize_vanilla_textures()` - Extracts from Minecraft JAR
- `get_vanilla_texture_path()` - Locates vanilla asset
- `get_colormap_path()` - Gets grass/foliage colormaps
- `get_vanilla_cache_dir()` - Cache directory location
- `get_suggested_minecraft_paths()` - Platform-specific MC paths
- `check_minecraft_installation()` - Verifies MC JAR exists

**launcher_detection.rs** (682 lines) - SECOND MOST COMPLEX
- `LauncherType` enum - Official, Modrinth, CurseForge, Prism, MultiMC, ATLauncher, GDLauncher, Technic, Custom
- `detect_all_launchers()` - Discovers all installed launchers
- `identify_launcher_from_path()` - Determines launcher type
- `get_resourcepacks_dir()` - Gets launcher's resourcepacks directory
- Platform-specific detection (Windows, macOS, Linux)
- macOS icon extraction from application bundles

**mc_paths.rs** (67 lines)
- `get_default_minecraft_dir()` - Platform-specific .minecraft location
- `get_default_resourcepacks_dir()` - resourcepacks subdirectory

**weaver_nest.rs** (139 lines)
- `build_weaver_nest()` - Generates optimized resource pack
- Writes pack.mcmeta and structures for combined packs
- Applies texture/model overrides

**zip.rs** (74 lines)
- `extract_zip_entry()` - Extracts specific file from ZIP
- Used for getting textures from ZIP resource packs

**texture_to_block_map.rs** (73 lines)
- Helper for texture-to-block ID mapping heuristics

## 4. Architecture Patterns

### Command-Based Architecture
- Each Tauri command wraps a library function
- Library functions (`*_impl`) are testable without Tauri
- Modern Tauri v2 uses custom error types instead of string responses

### Error Handling Strategy
- Custom `AppError` with structured error codes
- Automatic serialization to JSON for frontend
- Use of `anyhow::Result<T>` internally
- Conversion From traits to AppError

### Validation-First Approach
- All public commands validate inputs first
- DRY validation utilities in validation.rs
- Early returns with descriptive errors

### Vanilla Pack Fallback
- Every scan includes vanilla textures
- Models/blockstates fall back to vanilla if not in custom pack
- Vanilla assets extracted once and cached

### Complex Resolution Chain
For block rendering, the chain is:
1. Asset ID (e.g., "minecraft:block/dirt")
2. → Blockstate file (maps properties to models)
3. → Model reference (e.g., "minecraft:block/dirt")
4. → Model JSON (with parent inheritance)
5. → Final resolved model with textures

## 5. Testing Framework & Current Tests

### Frontend Testing Setup
- **Framework:** Vitest (configured in vite.config.ts)
- **Test Location:** `/home/user/weaver-bird/src/**/*.{test,spec}.{ts,tsx}`
- **Test Setup File:** `/home/user/weaver-bird/src/test/setup.ts`
- **Environment:** jsdom (browser simulation)
- **Assertion Library:** Testing Library + Jest DOM matchers

### Existing Frontend Tests (3 files)
1. `/home/user/weaver-bird/src/lib/three/textureLoader.test.ts` - Texture loading with caching
2. `/home/user/weaver-bird/src/lib/three/modelConverter.test.ts` - 3D model conversion
3. `/home/user/weaver-bird/src/components/Preview3D/BlockModel.test.tsx` - Component tests

### Backend Testing
- **Current Status:** No existing Rust unit tests
- **Only Test:** Minimal bash script at `/home/user/weaver-bird/test-backend.sh`
- **Test Data:** Mock resource packs at `/__mocks__/resourcepacks/`
- **No Test Framework:** No Rust test configuration in Cargo.toml

### Testing Best Practices from Frontend
- Comprehensive mocking of Tauri API
- Isolated test files per module
- Good test descriptions and assertions
- Cache validation testing
- Error path testing
- Fallback testing (pack → vanilla)

## 6. Key Functions/Classes Needing Test Coverage

### CRITICAL - High Priority
1. **blockstates.rs** - Core functionality (1,625 lines)
   - `resolve_blockstate()` - Complex resolution logic
   - `build_block_state_schema()` - Schema generation
   - Multipart blockstate handling
   - Weighted random selection
   - Edge cases for malformed blockstates

2. **launcher_detection.rs** - System integration (682 lines)
   - `detect_all_launchers()` - Multi-platform detection
   - `identify_launcher_from_path()` - Type detection
   - Platform-specific paths (Windows, macOS, Linux)
   - Icon extraction (macOS)

3. **pack_scanner.rs** - File I/O & Discovery (201 lines)
   - `scan_packs()` - Directory scanning
   - ZIP vs folder detection
   - Metadata extraction from pack.mcmeta
   - Error handling for malformed packs

4. **commands/packs.rs** - API Layer (869 lines)
   - `scan_packs_folder_impl()` - Main API endpoint
   - `build_weaver_nest_impl()` - Pack building
   - Validation integration
   - Error responses

### IMPORTANT - Medium Priority
5. **vanilla_textures.rs** - Asset Extraction (341 lines)
   - JAR extraction
   - Cache management
   - Fallback paths
   - Colormap handling

6. **asset_indexer.rs** - Index Building (228 lines)
   - Asset indexing logic
   - Provider mapping
   - File deduplication

7. **block_models.rs** - Model Resolution (395 lines)
   - Parent inheritance chain
   - Model loading
   - Vanilla fallback

8. **validation.rs** - Input Validation (96 lines)
   - All validation functions
   - Error message consistency

### USEFUL - Lower Priority
9. **mc_paths.rs** - Path Resolution (67 lines)
10. **texture_index.rs** - Texture Mapping (178 lines)
11. **weaver_nest.rs** - Pack Building (139 lines)
12. **zip.rs** - ZIP Operations (74 lines)

## 7. Testing Strategy Recommendations

### Test Organization
```
src-tauri/src/
├── commands/
│   ├── packs.rs
│   └── packs.test.rs          # NEW: Integration tests
├── util/
│   ├── blockstates.rs
│   ├── blockstates.test.rs    # NEW: Unit tests
│   ├── launcher_detection.rs
│   ├── launcher_detection.test.rs  # NEW: Platform-specific tests
│   └── ... (other utilities)
├── error.rs
├── error.test.rs              # NEW: Error handling tests
└── validation.rs
    └── validation.test.rs     # NEW: Input validation tests
```

### Test Patterns to Match Frontend
1. Use descriptive test names
2. Mock file system operations
3. Test both success and error paths
4. Validate error codes and messages
5. Test edge cases and boundaries
6. Use fixtures/test data (mock resource packs)

### Critical Test Scenarios
1. **Pack Scanning**
   - Empty directories
   - Multiple pack formats (ZIP + folders)
   - Malformed pack.mcmeta
   - Nested directory structures
   - Large packs

2. **Blockstate Resolution**
   - Simple blockstates (single model)
   - Variant blockstates (multiple options)
   - Multipart blockstates (complex conditions)
   - Missing blockstates
   - Fallback to vanilla

3. **Model Resolution**
   - Parent model inheritance chains
   - Circular parent references
   - Missing models
   - Display transformations

4. **Launcher Detection**
   - Each launcher type
   - Missing launchers
   - Custom paths
   - Platform-specific paths

5. **Input Validation**
   - Empty paths
   - Non-existent directories
   - Invalid pack orders
   - Invalid overrides

## 8. Dependency Tree & Module Relationships

```
main.rs (Tauri wrappers)
  └─ commands/packs.rs
       ├─ util/pack_scanner.rs → walks filesystem, extracts metadata
       ├─ util/asset_indexer.rs → indexes discovered assets
       ├─ util/vanilla_textures.rs → handles vanilla assets
       ├─ util/blockstates.rs → parses blockstate JSONs
       ├─ util/block_models.rs → resolves model inheritance
       ├─ util/launcher_detection.rs → detects Minecraft installations
       ├─ util/mc_paths.rs → provides platform paths
       ├─ util/texture_index.rs → maps textures to blocks
       ├─ util/weaver_nest.rs → builds optimized packs
       ├─ util/zip.rs → handles ZIP files
       ├─ validation.rs → validates inputs
       ├─ error.rs → error types
       └─ model/mod.rs → data structures
```

## Summary

The Weaverbird backend is a well-structured Rust/Tauri application with:
- **Clear separation of concerns**: Commands, utilities, validation, models
- **Comprehensive functionality**: Pack discovery, asset indexing, model resolution, launcher detection
- **Modern error handling**: Structured errors with codes and details
- **No existing Rust tests**: Great opportunity to establish testing patterns
- **Good foundation for testing**: Complex logic in isolated functions
- **3 main complexity areas**: blockstates.rs, launcher_detection.rs, commands/packs.rs

The codebase is ready for comprehensive test coverage using Rust's built-in testing framework.
