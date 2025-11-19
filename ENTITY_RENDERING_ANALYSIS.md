# Entity-Based Model Rendering Requirements Analysis

## Executive Summary

The Weaver Bird texture pack reviewer currently renders only **block-based 3D models** using Minecraft's block model JSON format and Three.js. To add entity rendering support (chests, shulker boxes, cows, chickens), significant architectural changes are needed to handle:

1. **Hierarchical bone-based geometry** instead of flat cuboid models
2. **Entity model formats** (.jem/.emf) instead of block JSON
3. **Animated textures** and frame-based rendering
4. **Conditional geometry** and texture variants (ETF/EMF mods)
5. **Complex material layering** (emissive, overlays, etc.)

This analysis explores the current rendering pipeline, identifies gaps, and recommends an implementation strategy.

---

## Part 1: Current Block Model Rendering Pipeline

### 1.1 Architecture Overview

```
Resource Pack
    ├── assets/<namespace>/textures/block/*.png  (Textures)
    └── assets/<namespace>/models/block/*.json    (Models)
                                ↓
        [Tauri Backend - Rust]
        ├── asset_indexer.rs        (Scans and indexes textures)
        ├── block_models.rs         (Loads JSON, handles inheritance)
        ├── blockstates.rs          (Resolves states to models)
        └── vanilla_textures.rs     (Vanilla asset fallback)
                                ↓
        [Frontend - TypeScript/React]
        ├── src/lib/tauri/blockModels.ts    (Tauri command bindings)
        ├── src/lib/three/modelConverter.ts (JSON → Three.js conversion)
        ├── src/lib/three/textureLoader.ts  (Texture loading)
        └── src/components/Preview3D/       (React Three Fiber components)
                                ↓
                        Three.js Canvas
                    (Block Model Visualization)
```

### 1.2 Current Block Model Flow

#### Phase 1: Rust Backend - Asset Discovery
**File:** `/home/user/weaver-bird/src-tauri/src/util/asset_indexer.rs`

```rust
// Scans packs for texture assets
fn extract_asset_id(file_path: &str) -> Option<String> {
    // Checks: "assets/minecraft/textures/block/stone.png"
    //     → "minecraft:block/stone"
    
    // Already supports entity textures!
    // "assets/minecraft/textures/entity/zombie.png"
    //     → "minecraft:entity/zombie"
}
```

**Key finding:** The asset indexer ALREADY supports extracting entity textures from the standard `assets/<ns>/textures/entity/` directory. This is visible in the test at line 213:
```rust
extract_asset_id("assets/minecraft/textures/entity/zombie.png"),
Some("minecraft:entity/zombie".to_string())
```

#### Phase 2: Rust Backend - Block Model Loading
**File:** `/home/user/weaver-bird/src-tauri/src/util/block_models.rs`

The system loads block models like this:
```rust
pub struct BlockModel {
    pub parent: Option<String>,                    // "minecraft:block/cube_all"
    pub textures: Option<HashMap<String, String>>, // {"all": "minecraft:block/dirt"}
    pub elements: Option<Vec<ModelElement>>,       // Cuboid definitions
}

pub struct ModelElement {
    pub from: [f32; 3],           // [0, 0, 0]
    pub to: [f32; 3],             // [16, 16, 16]
    pub rotation: Option<...>,    // Element-level rotation
    pub faces: HashMap<String, ElementFace>, // 6 faces (N/S/E/W/U/D)
}
```

**Blockstate Resolution:**
- `resolveBlockState()` takes a block ID like `"minecraft:block/chest"` 
- Returns concrete models with rotations from blockstate file
- Example: `chest` with `facing=west` → rotates model by 270°Y

#### Phase 3: Frontend - Model Conversion
**File:** `/home/user/weaver-bird/src/lib/three/modelConverter.ts`

```typescript
async function blockModelToThreeJs(
  model: BlockModel,
  textureLoader: (id: string) => Promise<THREE.Texture>,
  biomeColor?: Color,
  resolvedModel?: ResolvedModel
): Promise<THREE.Group>
```

**Conversion process:**
1. **Resolve texture variables** - Follow `#all` → `minecraft:block/dirt` chains
2. **For each element (cuboid):**
   - Create `THREE.BoxGeometry(width, height, depth)`
   - Apply custom UV coordinates from face definitions
   - Load textures for each of 6 faces
   - Create material array (1 material per face)
   - Position geometry at element center
3. **Apply element-level rotations** (around origin)
4. **Group all elements** and apply blockstate rotations

**Key limitation:** This pipeline assumes:
- Models are simple collections of cuboids
- No parent-child bone relationships
- No animation data
- Flat hierarchy (no nesting)

#### Phase 4: Frontend - Rendering
**File:** `/home/user/weaver-bird/src/components/Preview3D/BlockModel.tsx`

The component:
1. Loads the block model via `resolveBlockState()`
2. Converts it via `blockModelToThreeJs()`
3. Renders as a Three.js Group in React Three Fiber
4. Handles biome color tinting and potted plant variants

---

## Part 2: Entity Textures Organization

### 2.1 Where Entity Textures Are Stored

Standard Minecraft texture pack structure:

```
resourcepack/
├── assets/minecraft/textures/
│   ├── block/          (Currently rendered)
│   │   ├── stone.png
│   │   ├── dirt.png
│   │   └── ...
│   │
│   ├── item/          (Not currently rendered)
│   │   └── ...
│   │
│   └── entity/        (NOT YET RENDERED - This is what we need!)
│       ├── cow/
│       │   ├── cow.png
│       │   ├── cow_light.png
│       │   └── ...
│       ├── chicken/
│       │   ├── chicken.png
│       │   └── ...
│       ├── chest/
│       │   ├── chest.png
│       │   ├── chest_double.png
│       │   └── ...
│       └── shulker/
│           ├── shulker_black.png
│           ├── shulker_purple.png
│           └── ...
```

### 2.2 Where Entity Models Are Stored

Minecraft vanilla entity models are **NOT JSON files** - they're hardcoded in the Java client. However, resource packs that override them using **CEM (Custom Entity Models)** or **EMF (Entity Model Features)** store models here:

```
resourcepack/
├── assets/minecraft/models/
│   ├── block/          (Currently used)
│   ├── item/           (Not used)
│   └── no "entity" subdir in vanilla
│
├── optifine/cem/     (CEM format - if OptiFine pack)
│   ├── entity/
│   │   ├── cow.jem     (JEM = Java Entity Model)
│   │   ├── chicken.jem
│   │   └── ...
│
├── assets/minecraft/emf/  (EMF format - Entity Model Features)
│   ├── cow.emf
│   ├── chest.emf
│   └── ...
```

**Key insight:** Entity models aren't stored the same way as block models. They're in separate directories with different formats (.jem, .emf, or completely absent for vanilla).

### 2.3 Current Codebase References to Entities

**Backend:** Only 2 references:
1. `/src-tauri/src/util/asset_indexer.rs` line 213 - Test case showing entity texture extraction is supported
2. No actual entity model loading code

**Frontend:** Only 1 reference:
1. `/src/state/store.ts` - Generic comment about "entity structure" (unrelated to Minecraft entities)

**Documentation:** Extensive analysis exists in:
- `/docs/entity_feature_mods.md` - Detailed specification for ETF/EMF integration

---

## Part 3: Entity vs Block Model Technical Differences

### 3.1 Structural Complexity

| Aspect | Block Models | Entity Models |
|--------|------|------|
| **Format** | JSON (standardized) | Hardcoded Java / .jem / .emf |
| **Hierarchy** | Flat list of cuboids | Tree of bones/parts |
| **Geometry** | Static cuboids | Custom shapes, quads, vertices |
| **Animation** | Blockstate-driven (static in preview) | Skeletal animation, pose data |
| **Texture Layers** | Single texture per face | Multiple layers (base, overlay, emissive) |
| **Variants** | Via blockstate properties | Via ETF/EMF conditions |
| **Parent-Child** | No inheritance relationship | Bones have parent bones |

### 3.2 Rendering Complexity

#### Block Models (Current)
```
1 Blockstate (e.g., "facing=north")
    ↓
Lookup 1-N Models (usually 1)
    ↓
For each Model:
  - Resolve parent inheritance
  - Convert 6-faced cuboids to Three.js
  - Apply blockstate rotation
  - Render
```

#### Entity Models (Proposed)
```
1 Entity (e.g., "cow")
    ↓
Lookup EMF/CEM/Vanilla Model
    ↓
For each Bone in Model:
  - Load geometry (quads, vertices)
  - Load textures (potentially multiple per bone)
  - Check conditions (ETF rules - biome, weather, etc.)
  - Apply pose/animation
  - Render with inheritance from parent bone
    - Parent rotation + child rotation
    - Parent position + child position
```

### 3.3 Example: Cow vs Stone Block

**Stone Block (Current System):**
```json
{
  "parent": "minecraft:block/cube_all",
  "textures": {
    "all": "minecraft:block/stone"
  }
  // elements inherited from parent = 1 cuboid
}
```
- 1 model, 6 faces, 1 texture → Simple conversion to Three.js

**Cow (Proposed System):**
```
Cow Model (EMF/CEM):
├── Body (bone)
│   ├── Geometry: 8 quads
│   ├── Texture: minecraft:entity/cow/cow.png
│   └── Position: [0, 0, 0]
├── Head (bone)
│   ├── Geometry: 8 quads
│   ├── Texture: minecraft:entity/cow/cow.png
│   ├── Parent: Body
│   └── Position: [0, 6, -6]  (relative to Body)
├── LegFL (bone)
│   ├── Geometry: 4 quads
│   ├── Texture: minecraft:entity/cow/cow.png
│   ├── Parent: Body
│   └── Position: [-4, 0, -4]
├── LegFR (bone)
├── LegBL (bone)
└── LegBR (bone)
```

**Rendering cow requires:**
1. Loading bone hierarchy
2. Calculating world-space transforms (parent × child)
3. Loading textures per bone
4. Rendering each bone as a separate mesh (or grouped)
5. Optional: Applying skeletal animation

---

## Part 4: Technical Challenges for Entity Rendering

### 4.1 Model Format Challenge

**Problem:** Minecraft doesn't distribute entity models in resource packs.

Entity models are hardcoded in the Minecraft client. Resource packs can:
- Override **textures** (standard `entity/` folder)
- Override **geometry** via mods:
  - **CEM** (Custom Entity Models) - OptiFine format
  - **EMF** (Entity Model Features) - Format-agnostic mod
  - **Blockbench JSON** - For some custom content

**Solution Required:**
- Create a **fallback vanilla model loader** that ships with Weaverbird
  - Pre-convert vanilla models to JSON (or store as Three.js BufferGeometry)
  - Include models for: cow, chicken, chest, shulker, etc.
- Add **EMF/CEM parser** to extract custom geometry from resource packs
- Maintain a **model registry** mapping entity IDs to geometry

**Effort:** High - Need to manually extract/encode vanilla models OR license/embed existing model data

### 4.2 Hierarchical Transform Challenge

**Problem:** Block models are flat; entity models have parent-child bone relationships.

**Current Code (Block - Simple):**
```typescript
// All elements at same level
for (const element of model.elements) {
    mesh.position = calcCenter(element);
    group.add(mesh);  // Direct add
}
```

**Needed Code (Entity - Complex):**
```typescript
// Build tree of bones
interface Bone {
    name: string;
    geometry: THREE.BufferGeometry;
    position: [number, number, number];  // Relative to parent
    rotation: [number, number, number];
    parent?: Bone;
    children: Bone[];
}

function buildBoneHierarchy(bones: BoneData[]): Map<string, Bone> {
    // 1. Create bone objects
    // 2. Link parent-child relationships
    // 3. Calculate world transforms (parent × child)
}

function renderBones(bone: Bone, parentWorldMatrix: Matrix4) {
    const worldMatrix = parentWorldMatrix.multiply(bone.localMatrix);
    const mesh = createMesh(bone.geometry, bone.texture);
    mesh.matrix = worldMatrix;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    
    // Recursively render children
    for (const child of bone.children) {
        renderBones(child, worldMatrix);
    }
}
```

**Solution Required:**
- Extend `modelConverter.ts` to handle bone hierarchies
- Create `BoneRenderer` component for React Three Fiber
- Update state management to track bone visibility/animation

### 4.3 Texture Animation Challenge

**Problem:** Entity textures can have frame-based animation (.mcmeta files).

**Example:** `entity/cow/cow.png.mcmeta`
```json
{
    "animation": {
        "frametime": 10,
        "frames": [0, 1, 2, 1]
    }
}
```

Block textures currently ignore animation. Entities need it.

**Current Implementation:**
- Textures loaded once via `THREE.TextureLoader`
- No animation support

**Solution Required:**
- Parse `.mcmeta` files in texture loading
- Use Three.js texture atlasing or animated material
- Update UV coordinates in animation loop
- Handle frame timing (frametime in ticks)

**Complexity:** Medium - texture animation is well-understood in Three.js

### 4.4 ETF/EMF Variant Resolution Challenge

**Problem:** Resource packs use **Entity Texture Features (ETF)** and **Entity Model Features (EMF)** to:
- Pick textures based on conditions (biome, weather, NBT data)
- Swap model parts based on conditions
- Layer multiple textures (emissive, overlays)

**Example ETF Rule:** `optifine/random/entity/cow.properties`
```properties
textures=cow cow_alt cow_special
weights=0.8 0.15 0.05
biomes=plains swamp
conditions=!sneaking
```

**Current System:** No support for conditions or variant selection.

**Solution Required:**
- Parse ETF `.properties` files in backend
- Create **variant resolver** that evaluates conditions
- Store **render context** (biome, weather, time, entity NBT) in state
- Update texture selection before rendering

**Complexity:** Very High - Requires:
- ETF/EMF spec implementation
- Condition evaluation engine
- User-facing controls for context

### 4.5 Material Layering Challenge

**Problem:** ETF supports emissive/glow layers and overlays.

**Example:** A cow might have:
- Base texture: `cow.png`
- Emissive overlay: `cow_e.png` (glowing parts)
- Color overlay: `cow_overlay.png` (tinted layer)

**Current Implementation:**
- Single material per face
- No support for layering

**Solution Required:**
- Create **multi-material meshes**:
  ```typescript
  const materials = [
      baseMaterial,      // diffuse
      emissiveMaterial,  // additive glow
      overlayMaterial    // tinted layer
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  ```
- Use `MeshGroup` or split geometry by material slots
- Update lighting model to handle emissive correctly

**Complexity:** Medium - Standard Three.js technique

---

## Part 5: Files That Would Need Modification

### 5.1 Rust Backend Changes

#### NEW FILES NEEDED:
1. **`src-tauri/src/util/entity_models.rs`** - Load entity models
   - Support vanilla hardcoded models
   - Parse .jem/.emf formats
   - Convert to common JSON structure

2. **`src-tauri/src/util/emf_parser.rs`** - Parse EMF files
   - Extract bone definitions
   - Extract geometry data
   - Extract texture assignments

3. **`src-tauri/src/util/etf_parser.rs`** - Parse ETF properties
   - Extract texture variant rules
   - Extract conditions
   - Extract layer definitions

#### MODIFIED FILES:
1. **`src-tauri/src/util/asset_indexer.rs`**
   - Add scanning for `.jem`, `.emf`, and `.properties` files
   - Extract entity asset metadata

2. **`src-tauri/src/commands/packs.rs`**
   - Add new Tauri command: `scan_entity_models(packs_dir)`
   - Return entity model metadata alongside textures

3. **`src-tauri/src/model/mod.rs`**
   - Add `EntityModel`, `Bone`, `EMFDescriptor` data structures

### 5.2 TypeScript/React Changes

#### NEW FILES NEEDED:
1. **`src/lib/three/entityModelConverter.ts`** - Entity model to Three.js
   - Convert bone hierarchies to Three.js Groups
   - Handle texture loading per bone
   - Apply transformations

2. **`src/lib/three/entityTextureResolver.ts`** - Resolve ETF variants
   - Evaluate ETF conditions
   - Select textures based on context
   - Handle weighted random selection

3. **`src/lib/three/boneAnimator.ts`** - Handle bone animation
   - Parse animation data
   - Update bone transforms over time
   - Handle skeletal animation

4. **`src/components/Preview3D/EntityModel.tsx`** - React component for entities
   - Mirror `BlockModel.tsx` but for entities
   - Handle bone hierarchy rendering
   - Support animation playback

5. **`src/hooks/useEntityModel.ts`** - Hook for entity loading
   - Load entity model and textures
   - Handle variant resolution
   - Cache models

#### MODIFIED FILES:
1. **`src/components/Preview3D/index.tsx`**
   - Add toggle for block vs entity preview
   - Route to `BlockModel` or `EntityModel`

2. **`src/lib/assetUtils.ts`**
   - Add `isEntityTexture()`, `getEntityType()` utilities
   - Beautify entity IDs

3. **`src/state/store.ts`**
   - Add render context: `{ biome, weather, time, nbt }`
   - Add entity variant selectors
   - Store entity models and ETF/EMF metadata

4. **`src/lib/tauri/blockModels.ts`**
   - Add new Tauri command bindings for entity model loading

---

## Part 6: Implementation Strategy & Phased Approach

### Phase 1: Foundation (2-3 weeks)
**Goal:** Render simple vanilla entities without animations or variants

**Tasks:**
1. Embed or download vanilla entity models (cow, chicken, chest)
   - Convert from Java source to JSON/Three.js format
   - Store in `src/assets/vanilla_models/`
2. Create `EntityModel` Rust structure
3. Add `load_entity_model()` Tauri command
4. Create basic `EntityModel.tsx` React component
5. Add bone hierarchy rendering in Three.js

**Testing:** Render a plain cow/chest without colors or animations

### Phase 2: Texture Support (2-3 weeks)
**Goal:** Load entity textures from packs and apply them correctly

**Tasks:**
1. Extend texture loader to handle entity textures
2. Implement bone-to-texture mapping
3. Add EMF parser for basic geometry
4. Update asset indexer to find entity files
5. Create entity texture selector UI

**Testing:** Render cow with custom texture from resource pack

### Phase 3: Variant System (3-4 weeks)
**Goal:** Support ETF texture variants and conditions

**Tasks:**
1. Implement ETF `.properties` parser
2. Create variant resolver with condition evaluation
3. Add render context controls to UI (biome picker, etc.)
4. Store variant data in state
5. Update texture selection logic

**Testing:** Select different cow variants based on biome/condition

### Phase 4: Advanced Features (3-4 weeks)
**Goal:** Animation, emissive layers, overlays

**Tasks:**
1. Parse `.mcmeta` animation files
2. Implement texture animation in render loop
3. Support multi-material meshes
4. Parse emissive/overlay texture rules
5. Add animation playback controls

**Testing:** Animated chest opening, glowing cow parts

### Phase 5: Polish & Integration (1-2 weeks)
**Goal:** Integrate with existing UI, optimize, test

**Tasks:**
1. Asset picker UI integration
2. Block vs Entity preview toggle
3. Performance optimization (LOD, culling)
4. Testing across multiple packs
5. Documentation

---

## Part 7: Recommended Approach

### 7.1 Start with a Concrete Example: Chests

**Why chests?**
- Fixed geometry (no skeletal animation)
- Rich texture variations (different wood types)
- ETF commonly used for chests
- Clear preview value

**Implementation steps:**
1. Manually create `chest_model.json` with bone structure
2. Implement bone hierarchy rendering
3. Load `entity/chest/` textures from packs
4. Parse ETF rules for chest variants
5. Test with 2-3 popular packs

### 7.2 Build Reusable Infrastructure

**Key abstractions:**
```typescript
// Generic bone-based model system
interface BoneData {
    name: string;
    parent: string | null;
    geometry: GeometryData;
    texture: TextureId;
    position: Vector3;
    rotation: Euler;
}

interface ModelData {
    type: 'entity' | 'block';
    bones: BoneData[];
    metadata: Record<string, unknown>;
}

// Variant resolver
function resolveVariant(
    model: ModelData,
    context: RenderContext,
    etfRules: ETFRule[]
): ResolvedTextures {
    // Return final texture assignments
}
```

### 7.3 Leverage Existing Infrastructure

**Reuse:**
- `textureLoader.ts` - Add entity texture paths
- `Preview3D/index.tsx` - Add entity toggle
- Tauri command pattern - Add entity commands
- Zustand store - Add entity state

**Don't rewrite:**
- Three.js setup (already good)
- Texture loading mechanism
- Pack metadata system

---

## Part 8: Open Questions & Unknowns

1. **Vanilla Model Distribution**
   - Do we embed vanilla models in the app?
   - Or download them?
   - How to keep them updated?

2. **EMF/CEM Support Priority**
   - How many packs use these?
   - Should we support both or just one?
   - What's the feature coverage?

3. **Animation Scope**
   - Full skeletal animation or just texture frames?
   - Pose data for different entity states?
   - Performance on complex models?

4. **ETF Condition Coverage**
   - Which conditions matter most? (biome, weather, equipment, etc.)
   - How to represent NBT in the UI?
   - Default values for unsupported conditions?

5. **Performance Targets**
   - Should it run on low-end machines?
   - Acceptable triangle count?
   - Texture memory limits?

---

## Part 9: Summary

### What's Already There
- Asset indexer supports entity textures
- Three.js rendering infrastructure
- Texture loading system
- Block model hierarchy (can be adapted)

### What's Missing
- Entity model format support
- Bone hierarchy rendering
- Texture animation
- ETF/EMF variant resolution
- Multi-material meshes

### Effort Estimate
- **Small Phase (Vanilla cow, no variants):** 3-4 weeks
- **Medium Phase (Multiple entities, basic variants):** 6-8 weeks
- **Full Phase (All features, all entities):** 12-16 weeks

### Risk Assessment
- **High Risk:** ETF condition evaluation complexity
- **Medium Risk:** Vanilla model distribution strategy
- **Low Risk:** Basic bone hierarchy rendering

### Next Steps
1. Decide on MVP scope (which entities first?)
2. Source vanilla model data
3. Create proof-of-concept with one entity (cow or chest)
4. Build out infrastructure incrementally
5. Prioritize variant features based on pack analysis

