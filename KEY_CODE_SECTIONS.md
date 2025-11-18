# Weaverbird Backend: Key Code Sections Requiring Tests

## 1. Core Command Handlers (commands/packs.rs - 869 lines)

### Most Critical: `scan_packs_folder_impl()` - Lines 50-82
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

---

### `resolve_block_state_impl()` - Lines 728-858
```rust
pub fn resolve_block_state_impl(
    pack_id: String,
    block_id: String,
    packs_dir: String,
    state_props: Option<std::collections::HashMap<String, String>>,
    seed: Option<u64>,
) -> Result<crate::util::blockstates::ResolutionResult, AppError>
```
**Tests needed:**
- Simple blockstate resolution
- With custom state properties
- With weighted random selection
- Block ID normalization (strips prefixes)
- Vanilla fallback when pack missing
- Error on malformed blockstate
- Error on missing block

---

## 2. Blockstate Resolution (util/blockstates.rs - 1,625 lines)

### Most Complex: `resolve_blockstate()` - Core Resolution Logic
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

---

### `build_block_state_schema()` - Lines ~600-700
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

---

## 3. Launcher Detection (util/launcher_detection.rs - 682 lines)

### Platform-Specific Detection: `detect_all_launchers()`
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

---

### Launcher Type Identification: `identify_launcher_from_path()`
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

---

## 4. Pack Scanning (util/pack_scanner.rs - 201 lines)

### `scan_packs()`
```rust
pub fn scan_packs(packs_dir: &str) -> Result<Vec<PackMeta>>
```

**Tests needed:**
```rust
#[test]
fn test_scan_packs_empty_directory() {
    // Create empty temp dir
    // Expected: Empty vec
}

#[test]
fn test_scan_packs_detects_zip() {
    // Create test.zip with pack.mcmeta
    // Expected: PackMeta with is_zip=true
}

#[test]
fn test_scan_packs_detects_folder() {
    // Create test_pack/pack.mcmeta
    // Expected: PackMeta with is_zip=false
}

#[test]
fn test_scan_packs_extracts_metadata() {
    // pack.mcmeta: {"description": "My Pack"}
    // Expected: description field populated
}

#[test]
fn test_scan_packs_extracts_icon() {
    // pack.png exists with image data
    // Expected: icon_data base64-encoded
}

#[test]
fn test_scan_packs_ignores_hidden() {
    // Create .hidden_pack/pack.mcmeta
    // Expected: Not in results
}

#[test]
fn test_scan_packs_sorted_by_name() {
    // Create packs: zeta, alpha, beta
    // Expected: [alpha, beta, zeta]
}
```

---

## 5. Validation (validation.rs - 96 lines)

### `validate_directory()`
```rust
pub fn validate_directory(path: &str, label: &str) -> AppResult<()>
```

**Tests needed:**
```rust
#[test]
fn test_validate_directory_empty_string() {
    let err = validate_directory("", "Test Dir");
    assert_eq!(err.unwrap_err().code, "VALIDATION_ERROR");
}

#[test]
fn test_validate_directory_nonexistent() {
    let err = validate_directory("/nonexistent/path", "Test Dir");
    assert_eq!(err.unwrap_err().code, "IO_ERROR");
}

#[test]
fn test_validate_directory_is_file_not_dir() {
    // Point to a file instead of directory
    let err = validate_directory(file_path, "Test Dir");
    assert_eq!(err.unwrap_err().code, "VALIDATION_ERROR");
}

#[test]
fn test_validate_directory_valid() {
    let temp_dir = create_temp_dir();
    assert!(validate_directory(temp_dir.path().to_str().unwrap(), "Test").is_ok());
}
```

---

### `validate_overrides()`
```rust
pub fn validate_overrides(
    overrides: &HashMap<String, OverrideSelection>,
    pack_order: &[String],
) -> AppResult<()>
```

**Tests needed:**
- Empty overrides (valid)
- Invalid pack ID in override
- Valid pack ID in override
- Empty asset ID
- Empty pack ID in override
- Empty variant path

---

## 6. Error Handling (error.rs - 97 lines)

### `AppError` Type Tests
```rust
#[test]
fn test_error_validation() {
    let err = AppError::validation("Invalid input");
    assert_eq!(err.code, "VALIDATION_ERROR");
    assert_eq!(err.message, "Invalid input");
}

#[test]
fn test_error_serialization() {
    let err = AppError::io("File not found");
    let json = serde_json::to_string(&err).unwrap();
    assert!(json.contains("IO_ERROR"));
    assert!(json.contains("File not found"));
}

#[test]
fn test_error_from_io() {
    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "test");
    let app_err = AppError::from(io_err);
    assert_eq!(app_err.code, "IO_ERROR");
}

#[test]
fn test_error_with_details() {
    let err = AppError::io("Failed").with_details("Stack trace here");
    assert_eq!(err.details, Some("Stack trace here".to_string()));
}
```

---

## 7. Block Models (util/block_models.rs - 395 lines)

### `resolve_block_model()` - Parent Inheritance
```rust
pub fn resolve_block_model(
    pack: &PackMeta,
    model_id: &str,
    vanilla_pack: &PackMeta,
) -> Result<BlockModel>
```

**Tests needed:**
```rust
#[test]
fn test_resolve_block_model_no_parent() {
    // model.json has no parent field
    // Expected: Direct model returned
}

#[test]
fn test_resolve_block_model_single_parent() {
    // model.json has parent "minecraft:block/cube"
    // Expected: Parent fields merged
}

#[test]
fn test_resolve_block_model_parent_chain() {
    // model.json -> parent -> grandparent -> great-grandparent
    // Expected: Full chain resolved
}

#[test]
fn test_resolve_block_model_circular_parent() {
    // A -> B -> A (circular reference)
    // Expected: Error detected
}

#[test]
fn test_resolve_block_model_missing_parent_vanilla_fallback() {
    // Parent not in pack, but in vanilla
    // Expected: Vanilla parent used
}

#[test]
fn test_resolve_block_model_missing_parent_error() {
    // Parent not in pack or vanilla
    // Expected: Error returned
}
```

---

## 8. Asset Indexing (util/asset_indexer.rs - 228 lines)

### `index_assets()`
```rust
pub fn index_assets(
    packs: &[PackMeta],
) -> Result<(Vec<AssetRecord>, HashMap<String, Vec<String>>)>
```

**Tests needed:**
- Single pack indexing
- Multiple pack indexing
- Asset deduplication across packs
- Provider mapping (which pack provides what)
- ZIP vs folder pack indexing
- Empty pack handling
- Texture path parsing

---

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

---

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

---

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

