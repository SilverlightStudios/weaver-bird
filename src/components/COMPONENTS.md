# Component Documentation

## AssetResults

**Purpose**: Displays paginated asset cards with lazy loading

**useEffects**:

- Progressive rendering batching: triggers on `renderCount`, `assets.length` changes
- Reset render count: triggers on `assets` change
- Asset grouping worker: triggers on `assets`, `getWinningPackForAsset` changes

**Utilities** (from `utilities.ts`):

- `getWinningPack`: determines winning pack for asset
- `generateDisplayName`: formats names for special assets  
- `needsGrassTint`: checks if asset needs grass tinting
- `needsFoliageTint`: checks if asset needs foliage tinting

**Usage Count**: 1 usage in `src/routes/main.tsx`

**Child Components**:

- `AssetCard`: renders individual asset card with 3D preview

---

## BiomeColorCard

**Purpose**: Interactive colormap selector for biome tinting

**useEffects**:

- Load colormap texture: triggers on `selectedSource`, `packs` changes
- Draw canvas & extract imageData: triggers on `colormapSrc` change

**Utilities** (from `utilities.ts`):

- `sampleColor`: samples RGB color from coordinates
- `groupHotspotsByCoordinate`: deduplicates biome hotspots
- `buildSourceOptions`: creates available colormap sources list
- `selectActiveSource`: determines active colormap source

**Usage Count**: 3 usages (`src/routes/main.tsx` x2, `src/components/Settings/ColormapSettings.tsx` x1)

**Child Components**:

- `ColorSourceDropdown`: pack/variant selector dropdown
- `BiomeHotspot`: individual biome coordinate marker

---

## BiomeSelector

**Purpose**: Dropdown selector for global biome-based color tinting

**useEffects**: None

**Utilities** (from `utilities.ts`):

- `handleBiomeSelection`: processes biome selection and updates global state for coordinate-based and hex-color biomes

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**: None

---

## CanvasSettings

**Purpose**: Conditional canvas settings panel based on render mode (3D/2D/Item)

**useEffects**: None

**Utilities**: None

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**:

- `SettingCheckbox`: Reusable checkbox with label and description
- `Canvas3DSettings`: 3D canvas floor grid toggle
- `Canvas2DSettings`: 2D canvas pixel grid and UV wrap toggles
- `CanvasItemSettings`: Item canvas grid, rotation, and hover animation toggles

---

## CanvasTypeSelector

**Purpose**: Floating mode selector (3D/2D/Item) positioned dynamically over canvas

**useEffects**: 1 effect (via `useElementPosition` hook)

**Hooks** (from `hooks/useElementPosition.ts`):

- `useElementPosition`: Tracks element position with ResizeObserver and window resize events

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**: None

---

## OptionsPanel

**Purpose**: Tabbed options panel for asset-specific configuration based on asset type

**useEffects**: 3 effects

- Variant reset on asset/pack change
- Variant change notification  
- Block state schema loading
- State reset on asset change

**Utilities** (from `utilities.ts`):

- `isPainting()`: Check if asset is a painting
- `isPotteryShard()`: Check if asset is a pottery shard
- `isDecoratedPot()`: Check if asset is a decorated pot block
- `isEntityDecoratedPot()`: Check if asset is an entity decorated pot texture
- `getDefaultTab()`: Determine default tab based on asset type

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components** (11 tabs):

- `TabIcon`: Reusable tab icon with tooltip
- `PotteryShardTab`: Pottery shard selector + 3D preview
- `EntityDecoratedPotTab`: Entity pot pattern selector
- `DecoratedPotTab`: Decorated pot configurator for all sides
- `PaintingTab`: Painting selection
- `ItemDisplayTab`: Item display mode information
- `BlockStateTab`: Block state properties panel
- `PotTab`: Potted plant toggle
- `TextureVariantTab`: Texture variant selector  
- `PackVariantsTab`: Resource pack variant chooser
- `AdvancedTab`: Advanced debug information

---

## OutputSettings

**Purpose**: Configuration panel for output directory and pack format

**useEffects**: None

**Utilities**: None

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**: None

---

## PackList

**Purpose**: Drag-and-drop resource pack manager with enable/disable functionality

**useEffects**: 1 effect (preview state sync on actualStructure change)

**Hooks** (from `useSort.ts`):

- `useSort`: Already extracted - manages sortable drag state

**Utilities** (from `utilities.ts`):

- `formatPackSize()`: Formats bytes to human-readable size
- `arraysEqual()`: Compares string arrays for equality

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**:

- `DroppableArea`: Drag-and-drop drop zone wrapper
- `SortablePackItem`: Individual draggable pack card
- `LauncherSelector`: Minecraft launcher dropdown selector

---

## ResourcePackCard

**Purpose**: Reusable pack card UI with dynamic accent color extraction from icon

**useEffects**: 1 effect (extract accent color from icon)

**Utilities** (from `colorUtils.ts`):

- `extractAccentColor()`: Extract dominant color from image data
- `rgbToHex()`: Convert RGB to hex string
- `rgbToHsl()`: Convert RGB to HSL color space
- `hslToHex()`: Convert HSL to hex string
- `shiftLightness()`: Adjust color lightness

**Usage Count**: 2 usages (PackList overlay + SortablePackItem)

**Child Components**: None

---

## SaveBar

**Purpose**: Save button with progress bar and status display for Weaver Nest build

**useEffects**: None

**Utilities**: None

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**:

- `SaveIcon`: Inline SVG icon component

---

## SearchBar

**Purpose**: Search input with autocomplete dropdown for assets and categories

**useEffects**: 3 effects

- Input value sync: triggers on external `value` change
- Debounce search: triggers on `inputValue` change (300ms debounce)
- Click outside handler: triggers on `open` state change

**Utilities**: None (uses utilities from `@lib/searchUtils`)

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**: None

---

## Settings

**Purpose**: Settings drawer with tabs for Minecraft locations, vanilla textures, and target version

**useEffects**: None

**Utilities**: None

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components** (3 tabs):

- `MinecraftLocations`: Minecraft launcher detection and path configuration
- `VanillaTextureVersion`: Minecraft version selector for vanilla textures
- `TargetVersion`: Target Minecraft version for pack compatibility

---

## TextureVariantSelector

**Purpose**: World/Inventory texture variant selector with thumbnail grid

**useEffects**: 1 effect (view mode sync with asset type)

**Hooks** (from `hooks/useVariantTexture.ts`):

- `useVariantTexture`: Loads texture URL for variant from winning pack or vanilla

**Utilities** (from `utilities.ts`):

- `getVariantDisplayName()`: Formats friendly variant names with Default indicator

**Usage Count**: 1 usage (OptionsPanel/TextureVariantTab)

**Child Components**:

- `TextureThumbnail`: Individual variant thumbnail with tooltip

---

## VanillaTextureProgress

**Purpose**: Progress bar for vanilla texture caching operation

**useEffects**: None

**Utilities**: None

**Usage Count**: 1 usage (`src/routes/main.tsx`)

**Child Components**: None

---

## VariantChooser

**Purpose**: Pack variant selector with texture previews for overriding resource pack priority

**useEffects**: 1 effect (load texture URLs for provider packs)

**Utilities**: None

**Usage Count**: 1 usage (OptionsPanel/PackVariantsTab)

**Child Components**: None

---

## MinecraftCSSBlock

**Purpose**: Renders 3D isometric Minecraft block previews using CSS transforms

**useEffects**: 5 effects (**performance-critical** - not extracted)

- Deferred 3D model loading with stagger/queue (transition optimization)
- 2D fallback texture loading + eager 3D geometry preloading
- 3D model processing when geometry ready
- Foliage/grass tinting application (via hook)
- Tint cache cleanup on unmount (via hook)

**Utilities**:

- `utilities.ts`: 5 block processing helpers
- `tint-utilities.ts`: Grass/foliage tinting logic and color resolution

**Hooks**:

- `tint-hooks.ts`: `useBlockTinting` for all tinting logic and store subscriptions

**Child Components**:

- `Block2D`: 2D fallback texture rendering
- `Block3D`: 3D isometric face rendering with tinting

**Usage Count**: 1 usage (AssetCard for preview thumbnails)

**Performance Optimizations**:

- Selective subscriptions (only tinted blocks subscribe to colormap colors)
- Memoized tint detection (caches grass/foliage needs)
- Deferred 3D loading with requestIdleCallback + global transition queue
- Web Worker for geometry processing (blockGeometryWorker)
- Eager preloading (processes 3D in background while showing 2D)
