# Weaverbird - AI Context Documentation

This document provides essential codebase knowledge for AI assistants helping with development.

## Project Overview

**Weaverbird** is a desktop application for managing Minecraft resource packs with drag-and-drop priority ordering and asset-level override control.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Zustand (state) + Immer
- Backend: Rust (Tauri v2 commands)
- Build: Vite 7
- Styling: SCSS Modules + CSS Variables + modern CSS features
- 3D: React Three Fiber + Three.js

## Architecture

### Directory Structure

```
src/
├── components/          # Feature components
│   ├── PackList/       # Drag-drop pack ordering
│   ├── SearchBar/      # Asset search
│   ├── AssetResults/   # Filtered assets with variants
│   ├── Preview3D/      # 3D block preview (Three.js + R3F)
│   ├── OutputSettings/ # Output directory picker
│   └── SaveBar/        # Build & export
├── routes/main.tsx     # Main layout orchestrator
├── state/              # Zustand store + selectors
│   ├── store.ts        # State + actions (with Immer)
│   ├── selectors.ts    # Memoized selectors
│   └── types.ts        # Type definitions
├── lib/
│   ├── tauri/          # Tauri command wrappers
│   └── three/          # Three.js model/texture converters
└── ui/                 # Design system
    ├── components/     # Reusable UI components
    └── tokens/         # SCSS mixins (shadows, rotations, patterns)

src-tauri/src/
├── commands/           # Tauri command implementations
│   ├── mod.rs
│   └── packs.rs        # Pack scanning, model loading, building
├── util/               # Core logic
│   ├── pack_scanner.rs    # Scan packs from filesystem
│   ├── asset_indexer.rs   # Extract assets from packs
│   ├── blockstates.rs     # Parse blockstate JSON
│   ├── block_models.rs    # Load/resolve block models
│   ├── weaver_nest.rs     # Build output resource pack
│   └── mc_paths.rs        # Minecraft directory paths
├── validation.rs       # Centralized validation
└── error.rs           # Structured AppError type
```

### State Management (Zustand)

**Location:** `src/state/store.ts`

```typescript
{
  packs: Record<PackId, PackMeta>           // Pack metadata
  packOrder: PackId[]                        // Priority order (drag-drop)
  assets: Record<AssetId, AssetRecord>      // All available assets
  providersByAsset: Record<AssetId, PackId[]> // Which packs provide each asset
  overrides: Record<AssetId, OverrideEntry> // User-selected pack per asset
  selectedAssetId?: AssetId                  // Currently previewed asset
  searchQuery: string                        // Asset search filter
  outputDir?: string                         // Export directory
  packFormat: number                         // Minecraft version format
}
```

**Key Actions:**
- `ingestPacks(packs)` - Load pack metadata
- `ingestAssets(assets)` - Load asset data
- `setPackOrder(order)` - Update pack priority
- `setOverride(assetId, packId)` - Override asset winner
- `setOutputDir(path)` - Set export directory

**Always use selectors** from `src/state/selectors.ts` for performance.

### Tauri Commands

**Available Commands:** (`src/lib/tauri.ts`)
```typescript
scanPacksFolder(path: string): Promise<ScanResult>
buildWeaverNest(request: BuildRequest): Promise<string>
getDefaultPacksDir(): Promise<string>
openFolderDialog(defaultPath?: string): Promise<string | null>
readBlockModel(packId, blockId, packsDir): Promise<BlockModel>
resolveBlockState(packId, blockId, packsDir, stateProps?, seed?): Promise<ResolutionResult>
getBlockStateSchema(packId, blockId, packsDir): Promise<BlockStateSchema>
loadModelJson(packId, modelId, packsDir): Promise<BlockModel>
```

## Key Components

### 3D Preview System

**Flow:**
```
User clicks texture asset
  ↓
Get winner pack from Zustand
  ↓
Tauri: resolveBlockState(packId, blockId, stateProps)
  ↓
Backend resolves blockstate → model ID(s) + rotations
  ↓
For each model: loadModelJson(packId, modelId)
  ↓
Frontend: blockModelToThreeJs(model, textureLoader, biomeColor)
  ↓
Three.js renders in React Three Fiber canvas
```

**Components:**
- `Preview3D/index.tsx` - Canvas setup, lighting, camera
- `Preview3D/BlockModel.tsx` - Loads and renders individual blocks
- `Preview3D/BlockStatePanel.tsx` - UI for block properties (facing, powered, etc.)

**Utilities:**
- `lib/three/modelConverter.ts` - Converts Minecraft JSON → Three.js geometry
- `lib/three/textureLoader.ts` - Loads textures with pack → vanilla fallback

### Block Rendering System

**Minecraft Model Pipeline:**
```
Block ID → Blockstate JSON → Model JSON → Textures
```

**Blockstate Types:**
1. **Variants** - Property combinations (e.g., `facing=north,powered=true`)
2. **Multipart** - Conditional model assembly (fences, walls, redstone)

**Backend (Rust):**
- `blockstates.rs` - Parses blockstate files, resolves variants/multipart
- `block_models.rs` - Loads models, resolves parent inheritance
- Model resolution includes texture variable resolution (`#all` → `block/dirt`)

**Frontend (TypeScript):**
- User can change block properties via `BlockStatePanel`
- Frontend calls `resolveBlockState` with new properties
- Renders multiple models for multipart blocks
- Applies rotations (x, y, z) from blockstate

## Development Workflow

### Build Commands
```bash
npm run dev          # Tauri dev mode with hot reload
npm run build        # Production desktop app
npm run vite-build   # Browser-only build
npm run type-check   # TypeScript validation
npm run lint         # ESLint
cargo check          # Rust validation (in src-tauri/)
npm run storybook    # Component documentation
```

### Code Patterns

**Adding a Tauri Command:**
1. Implement in `src-tauri/src/commands/packs.rs`
2. Add to `invoke_handler` in `src-tauri/src/main.rs`
3. Add TypeScript wrapper in `src/lib/tauri/*.ts`
4. Use `AppError` for structured errors

**Adding a Zustand Action:**
1. Define action in `src/state/store.ts` using Immer
2. Create selector in `src/state/selectors.ts` if needed
3. Import via `useStore()` or custom selector hook

**Error Handling:**
```typescript
try {
  await scanPacksFolder(path)
} catch (error) {
  const msg = formatError(error)  // Handles AppError + generic errors
  displayError(msg)
}
```

### UI Component Development

**Follows "Anti-Design" aesthetic** (punk/Minecraft):
- Asymmetric borders, offset shadows, playful rotations
- Heavy 3px borders, high contrast colors
- Spring animations, uppercase typography
- Halftone patterns, gradient overlays

**Start with:**
1. `src/ui/README.md` - Design tokens reference
2. `src/ui/ANTI_DESIGN_GUIDE.md` - Style principles
3. `src/ui/SHADCN_INTEGRATION_GUIDE.md` - Adapting components

**Component Structure:**
```
src/ui/components/MyComponent/
├── MyComponent.tsx
├── MyComponent.module.scss  # Imports @use "@/ui/tokens"
└── MyComponent.stories.tsx  # Storybook documentation
```

## Important Patterns

### Model Loading
- Always use `readBlockModel` → `resolveBlockState` → `loadModelJson` flow
- Block IDs are normalized: `minecraft:block/dirt` → `dirt`
- Models support parent inheritance (resolved on backend)
- Textures fall back to vanilla if not in pack

### Block State Resolution
- Empty properties default to schema defaults (e.g., `{distance: "1"}`)
- Variant key built from sorted properties: `"facing=north,powered=true"`
- Multipart evaluates conditions (AND, OR, pipe-separated values)
- Weighted random selection uses deterministic seed

### Three.js Resources
- Always dispose geometry/materials on unmount
- Canvas stays mounted (CSS `display:none` when no asset selected)
- Texture cache prevents redundant loads
- Placeholder colors: Orange (no elements), Magenta (missing texture)

## Common Issues

### Block Not Rendering
1. Check console for `[BlockModel]` errors
2. Verify blockstate exists: `assets/minecraft/blockstates/{block}.json`
3. Check model path in blockstate
4. Verify textures exist in pack or vanilla

### State Not Updating
1. Use selectors from `src/state/selectors.ts`
2. Ensure actions use Immer (mutate draft directly)
3. Check if component is subscribed to correct slice

### TypeScript Errors
1. Run `npm run type-check` for full report
2. Check Tauri command types match frontend wrappers
3. Verify Rust serde serialization uses `camelCase` for TS

## Testing

**Frontend:**
- Vitest + React Testing Library
- Place `*.test.ts` next to source files
- Use `@react-three/test-renderer` for Three.js

**Backend:**
- Rust tests in `#[cfg(test)]` modules
- Run `cargo test` in `src-tauri/`
- 23+ tests for blockstate resolution

**Manual:**
- `./test-backend.sh` - Scans mock packs
- Check console logs for detailed flow
- Use Storybook for UI component verification

## Future Work

See `docs/entity_feature_mods.md` for:
- Entity Texture Features (ETF) - Random/emissive textures
- Entity Model Features (EMF) - Custom entity geometry
- Connected Textures (CTM)
- OptiFine properties

## Resources

- [Minecraft Model Format](https://minecraft.wiki/w/Model)
- [Minecraft Blockstates](https://minecraft.wiki/w/Tutorials/Models)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Tauri v2 Docs](https://tauri.app/v2/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
