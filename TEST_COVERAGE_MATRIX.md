# Rust Backend Test Coverage Priority Matrix

## Module Test Coverage Roadmap

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

## Suggested Test File Structure

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
│   ├── launcher_detection.test.rs
│   │   ├── test_detect_all_launchers
│   │   ├── test_identify_launcher_official
│   │   ├── test_identify_launcher_modrinth
│   │   ├── test_identify_launcher_custom
│   │   └── ... (platform-specific tests)
│   │
│   ├── pack_scanner.test.rs
│   │   ├── test_scan_packs_empty_dir
│   │   ├── test_scan_packs_with_zips
│   │   ├── test_scan_packs_with_folders
│   │   ├── test_extract_metadata_from_zip
│   │   └── ... (10-15 tests)
│   │
│   ├── validation.test.rs
│   │   ├── test_validate_directory_valid
│   │   ├── test_validate_directory_missing
│   │   ├── test_validate_pack_order_empty
│   │   ├── test_validate_overrides_invalid_pack
│   │   └── ... (8-10 tests)
│   │
│   ├── error.test.rs
│   │   ├── test_app_error_construction
│   │   ├── test_app_error_serialization
│   │   ├── test_app_error_from_io
│   │   └── ... (5-8 tests)
│   │
│   ├── block_models.test.rs
│   ├── vanilla_textures.test.rs
│   ├── asset_indexer.test.rs
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
