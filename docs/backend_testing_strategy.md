# Backend Testing Strategy

This document provides a comprehensive testing strategy for Weaverbird's Rust backend, including priority matrices, key code sections, and detailed test scenarios.

## Test Coverage Priority Matrix

| Module | Lines | Complexity | Priority | Key Test Areas | Current Tests |
|--------|-------|-----------|----------|-----------------|---------------|
| **blockstates.rs** | 1,625 | ████████░ | CRITICAL | resolve_blockstate(), build_block_state_schema(), multipart handling, weighted selection | 0 |
| **launcher_detection.rs** | 682 | ████████░ | CRITICAL | detect_all_launchers(), identify_launcher_from_path(), platform paths | 0 |
| **commands/packs.rs** | 869 | ███████░░ | CRITICAL | scan_packs_folder_impl(), build_weaver_nest_impl(), validation, error handling | 0 |
| **pack_scanner.rs** | 201 | ████░░░░░ | HIGH | scan_packs(), ZIP detection, metadata extraction | 0 |
| **vanilla_textures.rs** | 341 | ████░░░░░ | HIGH | JAR extraction, cache management, colormap handling | 0 |
| **asset_indexer.rs** | 228 | ███░░░░░░ | HIGH | index_assets(), provider mapping, deduplication | 0 |
| **block_models.rs** | 395 | ███░░░░░░ | HIGH | resolve_block_model(), parent inheritance, vanilla fallback | 0 |
| **validation.rs** | 96 | ██░░░░░░░ | MEDIUM | validate_directory(), validate_pack_order(), validate_overrides() | 0 |
| **error.rs** | 97 | ██░░░░░░░ | MEDIUM | Error construction, serialization, From traits | 0 |
| **texture_index.rs** | 178 | ██░░░░░░░ | MEDIUM | TextureIndex::build(), get_primary_block() | 0 |
| **mc_paths.rs** | 67 | █░░░░░░░░ | LOW | Platform-specific path resolution | 0 |
| **weaver_nest.rs** | 139 | █░░░░░░░░ | LOW | build_weaver_nest(), pack combining | 0 |
| **zip.rs** | 74 | █░░░░░░░░ | LOW | extract_zip_entry() | 0 |

## Key Code Sections Requiring Tests

### 1. Core Command Handlers (commands/packs.rs - 869 lines)

#### `scan_packs_folder_impl()` - Lines 50-82

```rust
pub fn scan_packs_folder_impl(packs_dir: String) -> Result<ScanResult, AppError> {
    validation::validate_directory(&packs_dir, "Packs directory")?;
    let mut packs = pack_scanner::scan_packs(&packs_dir)
        .map_err(|e| AppError::scan(e.to_string()))?;
    let vanilla_pack = create_vanilla_pack()?;
    packs.push(vanilla_pack);
    let (assets, mut providers) = asset_indexer::index_assets(&packs)
        .map_err(|e| AppError::scan(format!("Asset indexing failed: {}", e)))?;
    // ... vanilla provider logic ...
    Ok(ScanResult { packs, assets, providers })
}
```

**Tests needed:**

- Valid directory with multiple packs
- Empty directory
- Non-existent directory (validation error)
- ZIP and folder packs mixed
- Vanilla pack inclusion
- Asset indexing

#### `resolve_block_state_impl()` - Lines 728-858

**Tests needed:**

- Simple blockstate resolution
- With custom state properties
- With weighted random selection
- Block ID normalization (strips prefixes)
- Vanilla fallback when pack missing
- Error on malformed blockstate
- Error on missing block

### 2. Blockstate Resolution (util/blockstates.rs - 1,625 lines)

#### `resolve_blockstate()` - Core Resolution Logic

```rust
pub fn resolve_blockstate(
    blockstate: &Blockstate,
    block_id: &str,
    state_props: Option<HashMap<String, String>>,
    seed: Option<u64>,
) -> AppResult<ResolutionResult>
```

**Key Features to Test:**

- Variant-based blockstates (simple models or weighted array)
- Multipart blockstates (conditional model application)
- Default state property extraction
- State property matching against variants
- Random model selection with weights
- When no seed → uses default property
- When seed provided → deterministic selection

**Test Scenarios:**

```
1. Simple blockstate (single model):
   Input: "dirt" block, no properties
   Expected: Single model "minecraft:block/dirt"

2. Variant blockstate (multiple options):
   Input: "oak_stairs" with {facing: "north", half: "bottom"}
   Expected: Specific model for that state

3. Weighted variants:
   Input: "oak_log" with weights [1, 1, 1, 1]
   Expected: Deterministic selection with seed

4. Multipart blockstate:
   Input: "oak_fence" with conditional parts
   Expected: Multiple models for each part

5. Missing properties:
   Input: Block with required properties not provided
   Expected: Uses default state
```

#### `build_block_state_schema()` - Lines ~600-700

```rust
pub fn build_block_state_schema(
    blockstate: &Blockstate,
    block_id: &str,
) -> BlockStateSchema
```

**Returns:**

```rust
BlockStateSchema {
    block_id: "oak_stairs",
    default_state: { "facing": "south", "half": "bottom", ... },
    properties: [
        BlockProperty { name: "facing", values: ["north", "south", "east", "west"] },
        BlockProperty { name: "half", values: ["top", "bottom"] },
        ...
    ]
}
```

**Tests needed:**

- Extract all unique property values from variants
- Generate correct default state
- Handle multipart conditions
- Error on empty blockstate

### 3. Launcher Detection (util/launcher_detection.rs - 682 lines)

#### Platform-Specific Detection: `detect_all_launchers()`

```rust
pub fn detect_all_launchers() -> Vec<LauncherInfo>
```

**Tests needed (must mock filesystem):**

```rust
#[test]
fn test_detect_all_launchers_official() {
    // Mock ~/.minecraft existence
    // Expected: Official launcher detected
}

#[test]
fn test_detect_all_launchers_multimc() {
    // Mock MultiMC directory structure
    // Expected: MultiMC detected with correct paths
}

#[test]
fn test_detect_all_launchers_modrinth() {
    // Mock Modrinth app directory
    // Expected: Modrinth detected
}

#[test]
#[cfg(target_os = "windows")]
fn test_windows_launcher_paths() {
    // Windows-specific path detection
}

#[test]
#[cfg(target_os = "macos")]
fn test_macos_launcher_paths() {
    // macOS-specific path detection
}
```

#### Launcher Type Identification: `identify_launcher_from_path()`

```rust
pub fn identify_launcher_from_path(path: &Path) -> Result<LauncherType>
```

**Tests needed:**

- Valid official launcher directory
- Valid MultiMC instances folder
- Valid Prism launcher setup
- Invalid/empty directory
- Directory with required marker files missing
- Ambiguous directory (could be multiple types)

## Test Execution Pyramid

```
                    ╱╲ Integration Tests (5-10 tests)
                  ╱    ╲ - Full workflows
                ╱        ╲ - Multi-module scenarios
              ╱────────────╲

            ╱╲ Unit Tests (40-60 tests)
          ╱    ╲ - Individual functions
        ╱        ╲ - Error cases
      ╱────────────╲

  ╱╲ Documentation & Examples
╱    ╲ - Code comments
╱      ╲ - Doctest examples
╱──────────╲
```

## Test File Structure

```
src-tauri/src/
├── commands/
│   └── packs.test.rs
│       ├── test_scan_packs_folder_impl_success
│       ├── test_scan_packs_folder_impl_invalid_dir
│       ├── test_scan_packs_folder_impl_with_zips
│       ├── test_build_weaver_nest_impl_success
│       ├── test_build_weaver_nest_impl_no_packs
│       ├── test_get_default_packs_dir_impl
│       └── ... (17 functions total)
│
├── util/
│   ├── blockstates.test.rs
│   │   ├── test_resolve_blockstate_simple
│   │   ├── test_resolve_blockstate_multipart
│   │   ├── test_resolve_blockstate_weighted_random
│   │   ├── test_build_block_state_schema
│   │   ├── test_malformed_blockstate
│   │   └── ... (15-20 tests)
│   │
│   ├── launcher_detection.test.rs (platform-specific tests)
│   ├── pack_scanner.test.rs (10-15 tests)
│   ├── validation.test.rs (8-10 tests)
│   ├── error.test.rs (5-8 tests)
│   └── ... (other modules)
│
└── integration_tests/
    ├── full_pack_processing.test.rs
    ├── launcher_integration.test.rs
    └── blockstate_resolution_pipeline.test.rs
```

## Mock Data Strategy

### Test Fixtures Location

```
src-tauri/tests/fixtures/
├── packs/
│   ├── simple_pack/
│   │   ├── pack.mcmeta
│   │   ├── pack.png
│   │   └── assets/minecraft/textures/block/dirt.png
│   │
│   ├── modded_pack/
│   │   └── assets/minecraft/blockstates/custom_block.json
│   │
│   └── malformed_pack/
│       ├── pack.mcmeta (invalid JSON)
│       └── missing.mcmeta
│
├── blockstates/
│   ├── simple.json
│   ├── multipart.json
│   ├── weighted.json
│   └── invalid.json
│
├── models/
│   ├── simple_model.json
│   ├── parent_model.json
│   └── inheritance_chain.json
│
└── launcher_paths/
    ├── windows_official.txt
    ├── macos_prism.txt
    └── linux_multimc.txt
```

## Test Execution Commands

```bash
# Run all Rust tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test file
cargo test --test blockstates_test

# Run specific test
cargo test test_resolve_blockstate_simple

# Run tests with coverage
cargo tarpaulin --out Html

# Run with concurrency control
cargo test -- --test-threads=1
```

## Integration Test Example

```rust
#[test]
fn test_full_block_rendering_pipeline() {
    // Setup: Create test packs directory
    let test_packs = setup_test_packs();
    
    // Step 1: Scan packs
    let scan_result = scan_packs_folder_impl(test_packs.path())
        .expect("Scan should succeed");
    assert!(scan_result.packs.len() > 0);
    
    // Step 2: Get blockstate schema
    let schema = get_block_state_schema_impl(
        "minecraft:vanilla",
        "oak_stairs",
        test_packs.path(),
    ).expect("Schema should load");
    assert!(schema.properties.len() > 0);
    
    // Step 3: Resolve blockstate
    let resolved = resolve_block_state_impl(
        "minecraft:vanilla",
        "oak_stairs",
        test_packs.path(),
        Some(schema.default_state),
        Some(42),
    ).expect("Resolution should succeed");
    assert!(resolved.models.len() > 0);
    
    // Step 4: Load model
    let model = load_model_json_impl(
        "minecraft:vanilla",
        resolved.models[0].model_id.clone(),
        test_packs.path(),
    ).expect("Model should load");
    assert!(model.elements.is_some() || model.parent.is_some());
}
```

## Test Data Fixtures

### Minimal pack.mcmeta

```json
{
  "pack": {
    "pack_format": 12,
    "description": "Test Pack"
  }
}
```

### Minimal blockstate (variant)

```json
{
  "variants": {
    "": { "model": "minecraft:block/dirt" }
  }
}
```

### Minimal model.json

```json
{
  "parent": "minecraft:block/cube_all",
  "textures": {
    "all": "minecraft:block/dirt"
  }
}
```

### Blockstate with multiple variants

```json
{
  "variants": {
    "facing=north,half=bottom": { "model": "minecraft:block/oak_stairs" },
    "facing=south,half=bottom": { "model": "minecraft:block/oak_stairs", "y": 180 },
    "facing=east,half=bottom": { "model": "minecraft:block/oak_stairs", "y": 90 },
    "facing=west,half=bottom": { "model": "minecraft:block/oak_stairs", "y": 270 }
  }
}
```

## Testing Utilities Needed

```rust
// Create temporary test directories
fn create_test_pack_dir(name: &str) -> TempDir { ... }

// Create mock pack with metadata
fn create_mock_pack(pack_dir: &Path, is_zip: bool) -> Result<()> { ... }

// Write test blockstate JSON
fn write_blockstate(pack_dir: &Path, block_id: &str, content: &str) -> Result<()> { ... }

// Write test model JSON
fn write_model(pack_dir: &Path, model_id: &str, content: &str) -> Result<()> { ... }

// Setup test MC directory structure
fn setup_test_minecraft_dir() -> TempDir { ... }

// Mock filesystem operations for launcher detection
#[cfg(test)]
mod mock_fs { ... }
```

## Integration Points to Test

1. **Pack Scanning Pipeline**
   - Directory scan → ZIP detection → Metadata extraction → Asset indexing

2. **Blockstate Resolution**
   - Read blockstate → Resolve variant → Get model → Resolve model inheritance

3. **Launcher Detection**
   - Platform check → Directory scan → Type identification → Path extraction

4. **Vanilla Fallback**
   - Custom pack lookup → Vanilla fallback → Error handling

5. **Build Weaver Nest**
   - Validate inputs → Scan packs → Index assets → Apply overrides → Build output
