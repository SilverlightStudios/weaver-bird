# JEM Parsing Guide: How Blockbench Processes OptiFine Entity Models

This document explains how Blockbench parses JEM (JSON Entity Model) files, using `allay.jem` from Fresh Animations as a detailed example.

## Table of Contents
1. [JEM File Structure Overview](#jem-file-structure-overview)
2. [Top-Level Properties](#top-level-properties)
3. [Model Parts Parsing](#model-parts-parsing)
4. [Coordinate System and Transform Logic](#coordinate-system-and-transform-logic)
5. [Submodels and Depth Handling](#submodels-and-depth-handling)
6. [JPM Files - JSON Part Models](#jpm-files---json-part-models)
7. [Box Geometry and Positioning](#box-geometry-and-positioning)
8. [UV Mapping System](#uv-mapping-system)
9. [Three.js Rendering Pipeline](#threejs-rendering-pipeline)
10. [Complete Allay Example Walkthrough](#complete-allay-example-walkthrough)

---

## JEM File Structure Overview

A JEM file has this basic structure:

```json
{
  "textureSize": [width, height],
  "models": [
    {
      "part": "vanilla_bone_name",
      "id": "unique_identifier",
      "translate": [x, y, z],
      "rotate": [rx, ry, rz],
      "boxes": [...],
      "submodels": [...]
    }
  ]
}
```

---

## Top-Level Properties

### `textureSize`
```json
"textureSize": [128, 128]
```

**What it is:** Defines the dimensions of the texture atlas in pixels.

**How Blockbench uses it:**
```javascript
if (model.textureSize) {
  Project.texture_width = parseInt(model.textureSize[0]) || 16;
  Project.texture_height = parseInt(model.textureSize[1]) || 16;
}
```

**For allay.jem:** The texture is 128×128 pixels, larger than vanilla's 64×32 to accommodate custom geometry.

**Reference:** [Blockbench optifine_jem.js:239-242](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L239-L242)

---

## Model Parts Parsing

### The `models` Array

Each entry in the `models` array represents either:
1. A **vanilla bone** that replaces/extends Minecraft's default geometry
2. An **attachment point** for external JPM (JSON Part Model) files

### Example: Head Part from Allay

```json
{
  "part": "head",
  "id": "head",
  "invertAxis": "xy",
  "translate": [0, -6, 0],
  "submodels": [...]
}
```

#### Field-by-field breakdown:

**`"part": "head"`**
- Maps to vanilla Minecraft's "head" bone
- Blockbench uses this for the group name in the outliner

**`"id": "head"`**
- Unique identifier for this bone
- Used in animations to reference this bone (e.g., `head.rx`)

**`"invertAxis": "xy"`**
- Coordinate system flag (always "xy" for JEM)
- Not used in modern Blockbench parsing (legacy field)

**`"translate": [0, -6, 0]`**
- **THIS IS CRITICAL**: The pivot point position in JEM coordinates
- JEM uses Y-up coordinates
- Three.js uses Y-up but with different conventions

---

## Coordinate System and Transform Logic

### The Translation Inversion

**Blockbench code:**
```javascript
let group = new Group({
  name: b.part,
  origin: b.translate,  // [0, -6, 0]
  rotation: b.rotate,
  // ...
})
group.origin.V3_multiply(-1);  // origin becomes [0, 6, 0]
```

**Why negate?** 
- JEM `translate` = "where the bone is positioned"
- Three.js `position` = "where the bone's origin/pivot is"
- These are conceptually the same but JEM stores it as translate for historical reasons
- In our code, we convert: `origin = [-translate[0], -translate[1], -translate[2]]`

### Example: Allay Head

```
JEM translate:     [0, -6, 0]
Three.js position: [0, 6, 0]   ← This is where the head's pivot point is in world space
```

The head's pivot is 6 units above the body's origin (which is at Y=0).

**Reference:** [Blockbench optifine_jem.js:264-275](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L264-L275) - Group creation with origin negation at line 273

---

## Submodels and Depth Handling

This is the **most important** part of JEM parsing and where many implementations fail.

### The Depth Rule

**Blockbench code (optifine_jem.js:343-345):**
```javascript
if (depth >= 1 && subsub.translate) {
  subsub.translate[0] += p_group.origin[0];
  subsub.translate[1] += p_group.origin[1];
  subsub.translate[2] += p_group.origin[2];
}
```

**What this means:**
- **Depth 0** (root parts): Use translate as-is
- **Depth ≥ 1** (nested submodels): Add parent's translate to child's translate

### Why This Matters

In JEM, submodel positions are **relative to their parent**, but the `translate` values are stored in **absolute local coordinates**. To convert to Three.js hierarchy, we need to accumulate positions.

### Export vs Import (Critical!)

**During EXPORT (Blockbench → JEM file):**
```javascript
if (depth >= 1) {
  bone.translate[0] -= group.origin[0];  // SUBTRACT
  bone.translate[1] -= group.origin[1];
  bone.translate[2] -= group.origin[2];
}
```

**During IMPORT (JEM file → Blockbench):**
```javascript
if (depth >= 1 && subsub.translate) {
  subsub.translate[0] += p_group.origin[0];  // ADD
  subsub.translate[1] += p_group.origin[1];
  subsub.translate[2] += p_group.origin[2];
}
```

This is the **inverse operation** - export subtracts to make positions relative, import adds to make them absolute for Three.js.

**References:**
- [Blockbench optifine_jem.js:343-347](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L343-L347) - Import: ADD parent translate (parse)
- [Blockbench optifine_jem.js:163-166](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L163-L166) - Export: SUBTRACT parent origin (compile)

---

## JPM Files - JSON Part Models

### What is a JPM?

**JPM (JSON Part Model)** is a separate file format that represents a **single model part** without the entity binding. It's essentially a JEM file with only one model entry and no `part` field.

**Key differences:**
- **JEM**: Full entity model with multiple parts bound to vanilla bones
- **JPM**: Single reusable part that can be attached anywhere

### JPM File Structure

A JPM file looks like a single model from a JEM, minus the `part` field:

```json
{
  "id": "custom_part_name",
  "translate": [0, 0, 0],
  "rotate": [0, 0, 0],
  "boxes": [...],
  "submodels": [...],
  "textureSize": [64, 64],
  "credit": "Creator Name"
}
```

**Compare to JEM model:**
```json
// In JEM
{
  "part": "head",      ← Binds to vanilla bone
  "id": "head",
  "translate": [0, -6, 0],
  // ...
}

// In JPM
{
  // NO "part" field!
  "id": "custom_head",
  "translate": [0, -6, 0],
  // ...
}
```

### How JPM Files Are Referenced in JEM

Looking at allay.jem, you'll see references like this:

```json
{
  "part": "body",
  "id": "head_part",
  "model": "allay_head.jpm",
  "attach": "true"
}
```

**What this means:**
1. **`part: "body"`** - This attachment should become a child of the "body" bone
2. **`id: "head_part"`** - The loaded JPM will be named "head_part" in the bone hierarchy
3. **`model: "allay_head.jpm"`** - Load external file `allay_head.jpm`
4. **`attach: "true"`** - Mark this as an attachment (makes it a child of the part)

### Why Use JPM Files?

**Problem:** JEM files can get very large and hard to maintain.

**Solution:** Split complex models into reusable parts.

**Example use case - Allay in Fresh Animations:**
```
allay.jem (main file)
  ├─ Defines core structure
  ├─ Contains complex animations
  └─ References external parts:
      ├─ allay_head.jpm
      ├─ allay_body.jpm
      ├─ allay_body2.jpm
      ├─ allay_right_arm.jpm
      ├─ allay_left_arm.jpm
      ├─ allay_right_wing.jpm
      └─ allay_left_wing.jpm
```

**Benefits:**
1. **Modularity**: Edit individual parts without touching main file
2. **Reusability**: Same JPM can be used across multiple entities
3. **Organization**: Separate geometry from animation logic
4. **Version control**: Easier to track changes to specific parts

### How Blockbench Parses JPM

**From optifine_jpm.js:**
```javascript
parse(model, path) {
  // Set texture size from JPM
  if (model.textureSize) {
    Project.texture_width = parseInt(model.textureSize[0]) || 16;
    Project.texture_height = parseInt(model.textureSize[1]) || 16;
  }
  
  // Wrap JPM in a JEM-like structure
  let jem_model = {
    _is_jpm: true,           // Flag to indicate JPM mode
    invertAxis: 'xy',
    models: [model]          // Single model entry
  }
  
  // Parse using the regular JEM parser
  Codecs.optifine_entity.parse(jem_model, path);
}
```

**The `_is_jpm` flag changes behavior:**
```javascript
// In JEM parser:
if (!model._is_jpm) {
  // Create a Group bound to a vanilla part
  group = new Group({
    name: b.part,  // Use vanilla bone name
    origin: b.translate,
    // ...
  })
} else {
  // JPM mode: create standalone geometry without part binding
}

// Box positioning also differs:
if (p_group && (p_group.parent !== 'root' || model._is_jpm)) {
  // Adjust box positions relative to parent
}
```

**Reference:** 
- [Blockbench optifine_jpm.js:33-47](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jpm.js#L33-L47) - JPM parsing and `_is_jpm` flag
- [Blockbench optifine_jem.js:264](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L264) - Check for `_is_jpm`
- [Blockbench optifine_jem.js:332](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L332) - Box positioning with `_is_jpm`

### JPM Attachment System

When a JEM references a JPM with `attach: true`, it creates a parent-child relationship:

**Allay example:**
```json
// In allay.jem
{
  "part": "body",
  "id": "head_part",
  "model": "allay_head.jpm",
  "attach": "true"
}
```

**What happens:**
1. Load `allay_head.jpm` from disk
2. Parse it as a standalone part
3. Create a bone named `"head_part"`
4. Attach `"head_part"` as a child of `"body"`

**Resulting hierarchy:**
```
body (vanilla bone)
  └─ head_part (from allay_head.jpm)
       └─ [geometry from JPM]
```

### Our Implementation

In our JEM parser:

```typescript
if (modelPart.attach) {
  const childId = modelPart.id || modelPart.part || "";
  const parentPart = modelPart.part || "";
  
  if (childId && parentPart && childId !== parentPart) {
    attachments.push({ childId, parentPart });
    console.log(
      `[JEM Parser] Found attachment: "${childId}" should be child of "${parentPart}"`
    );
  }
  continue;  // Don't parse as regular part
}

if (modelPart.model && !modelPart.boxes && !modelPart.submodels) {
  console.log(
    `[JEM Parser] Skipping external model reference: ${modelPart.part || modelPart.id} -> ${modelPart.model}`
  );
  continue;  // Skip for now, would need to load JPM file
}
```

**Current limitation:** We log JPM references but don't actually load the external files yet.

### JPM File Location

JPM files are located in the same directory as the JEM file that references them:

```
resourcepack/
  assets/
    minecraft/
      optifine/
        cem/
          allay.jem            ← References JPM files
          allay_head.jpm       ← External part file
          allay_body.jpm
          allay_body2.jpm
          ...
```

**File resolution:**
```typescript
const jemPath = "assets/minecraft/optifine/cem/allay.jem";
const jpmReference = "allay_head.jpm";

// Resolve relative to JEM file's directory
const jpmPath = path.join(
  path.dirname(jemPath), 
  jpmReference
);
// Result: "assets/minecraft/optifine/cem/allay_head.jpm"
```

### When JPM Files Don't Exist

In the allay.jem case, it references JPM files that **don't actually exist** in Fresh Animations. This is interesting!

**Possible reasons:**
1. **Legacy references**: Older versions had separate JPM files
2. **Optional optimization**: Pack works without them
3. **Fallback mechanism**: Engine uses inline geometry when JPM missing
4. **Documentation/examples**: Shows what could be split out

**What happens when JPM is missing:**
- OptiFine/Blockbench: Silently ignores the missing reference
- The `attach` entry creates an empty bone
- Animations referencing that bone do nothing
- No errors, just missing geometry

**Fresh Animations pattern:**
Instead of using external JPM files, they define **everything inline** in the main JEM, then use `attach: true` entries to create **animation-only attachment points**:

```json
// Inline geometry in allay.jem
{
  "part": "body",
  "id": "body",
  "boxes": [...],  // Actual geometry here
  "submodels": [
    {
      "id": "head2",
      "boxes": [...]  // Head geometry inline
    }
  ]
},

// Later: Create attachment point for animations
{
  "part": "body",
  "id": "head_part",
  "model": "allay_head.jpm",  // File doesn't exist!
  "attach": "true"
}
```

The `head_part` bone is created but empty, used only as a transform target in animations:

```json
{
  "head_part.rx": "head2.rx",
  "head_part.ty": "head2.ty + 6"
}
```

This lets them **duplicate transforms** from real bones to virtual attachment points.

---

## Box Geometry and Positioning

### Box Structure in JEM

A box defines a rectangular cuboid with two methods: **box_uv** (simple) or **per-face UV** (advanced).

#### Example: Allay Body Box

```json
{
  "coordinates": [-1.5, 2, -1, 3, 4, 2],
  "uvNorth": [8, 48, 20, 64],
  "uvEast": [0, 48, 8, 64],
  "uvSouth": [28, 48, 40, 64],
  "uvWest": [20, 48, 28, 64],
  "uvUp": [20, 48, 8, 40],
  "uvDown": [32, 40, 20, 48]
}
```

### Coordinates Array

**Format:** `[x, y, z, width, height, depth]`

For the allay body: `[-1.5, 2, -1, 3, 4, 2]`

**Breaking it down:**
- **Position:** `[-1.5, 2, -1]` - Where the box starts (minimum corner)
- **Size:** `[3, 4, 2]` - Width (X), Height (Y), Depth (Z)

**Converting to from/to:**
```javascript
const from = [x, y, z] = [-1.5, 2, -1]
const to = [x + width, y + height, z + depth] = [1.5, 6, 1]
```

**Box corners in 3D space:**
```
from: (-1.5, 2, -1)  ←─────┐
                            │  3 wide
to:   ( 1.5, 6,  1)  ←─────┘
         ↑    ↑
         │    └─ 4 tall
         └────── 2 deep
```

### Box Positioning Relative to Parent

**Critical Blockbench code:**
```javascript
if (p_group && (p_group.parent !== 'root' || model._is_jpm)) {
  for (var i = 0; i < 3; i++) {
    base_cube.from[i] += p_group.origin[i];
    base_cube.to[i] += p_group.origin[i];
  }
}
```

**What this does:**
- For **non-root** groups (submodels), box coordinates are adjusted by the parent's origin
- This makes boxes positioned relative to their parent bone's pivot point

**Reference:** [Blockbench optifine_jem.js:332-337](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L332-L337) - Box coordinate adjustment for submodels

**Example with allay body2 box:**
```json
// body2 submodel
{
  "id": "body2",
  "translate": [0, 4, 0],  // After depth adjustment: [0, -2, 0]
  "boxes": [
    {
      "coordinates": [-1.5, -3, -1, 3, 5, 2]
    }
  ]
}
```

**Parsing:**
1. Parent (body) origin: `[0, 6, 0]`
2. Body2 origin after adjustment: `[0, 2, 0]` (relative to body)
3. Box coordinates: `[-1.5, -3, -1, 3, 5, 2]`
4. **Adjustment:** Since body2 is a submodel (depth=1):
   ```javascript
   from = [-1.5, -3, -1] + [0, 2, 0] = [-1.5, -1, -1]
   to = [1.5, 2, 1] + [0, 2, 0] = [1.5, 4, 1]
   ```

### Size Inflation

**`sizeAdd` property:**
```json
{
  "coordinates": [-1.5, -3, -1, 3, 5, 2],
  "sizeAdd": -0.2
}
```

**Effect:**
```javascript
const inflate = box.sizeAdd || 0;  // -0.2
from = [x - inflate, y - inflate, z - inflate]
     = [-1.5 - (-0.2), -3 - (-0.2), -1 - (-0.2)]
     = [-1.3, -2.8, -0.8]

to = [x + width + inflate, y + height + inflate, z + depth + inflate]
   = [-1.5 + 3 + (-0.2), -3 + 5 + (-0.2), -1 + 2 + (-0.2)]
   = [1.3, 1.8, 0.8]
```

**Purpose:** 
- Positive values: Make box slightly larger (overlay/armor effect)
- Negative values: Make box slightly smaller (inner layer, like body2)

**Reference:** [Blockbench optifine_jem.js:118-120](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L118-L120) - `sizeAdd` property handling

---

## UV Mapping System

### Two UV Systems

#### 1. Box UV (Simple, Auto-Generated)

```json
{
  "coordinates": [-1.5, 2, -1, 3, 4, 2],
  "textureOffset": [0, 0]
}
```

**How it works:**
- Minecraft "unfolds" the box onto the texture in a standard pattern
- `textureOffset` = `[u, v]` = top-left corner of the UV layout

**UV Layout Pattern (for a box with size [W, H, D]):**
```
    ┌─────┬─────┬─────┬─────┐
    │ Top │Front│Bottom│Back │  ← Standard unfold pattern
    │ D×W │ W×H │ D×W │ W×H │
    └─────┴─────┴─────┴─────┘
```

**Our implementation:**
```typescript
function calculateBoxUV(u: number, v: number, width: number, height: number, depth: number) {
  return {
    north: [u + depth, v + depth, u + depth + width, v + depth + height],
    east: [u, v + depth, u + depth, v + depth + height],
    south: [u + depth + width + depth, v + depth, u + depth + width + depth + width, v + depth + height],
    west: [u + depth + width, v + depth, u + depth + width + depth, v + depth + height],
    up: [u + depth, v, u + depth + width, v + depth],
    down: [u + depth + width, v, u + depth + width + width, v + depth],
  };
}
```

#### 2. Per-Face UV (Advanced, Explicit)

```json
{
  "coordinates": [-1.5, 2, -1, 3, 4, 2],
  "uvNorth": [8, 48, 20, 64],
  "uvEast": [0, 48, 8, 64],
  "uvSouth": [28, 48, 40, 64],
  "uvWest": [20, 48, 28, 64],
  "uvUp": [20, 48, 8, 40],
  "uvDown": [32, 40, 20, 48]
}
```

**Format:** Each face UV is `[u1, v1, u2, v2]`
- `(u1, v1)` = top-left corner in pixels
- `(u2, v2)` = bottom-right corner in pixels

**Example: North face `[8, 48, 20, 64]`**
```
Texture coordinates (pixels):
  (8, 48) ┌────────┐ (20, 48)
          │ North  │
          │  Face  │
 (8, 64)  └────────┘ (20, 64)

UV coordinates (normalized):
  u1 = 8/128 = 0.0625
  v1 = 48/128 = 0.375
  u2 = 20/128 = 0.15625
  v2 = 64/128 = 0.5
```

### UV Coordinate Conversion

**JEM uses pixel coordinates**, Three.js uses normalized UV (0.0 to 1.0).

**Conversion formula:**
```typescript
const textureSize = [128, 128];  // From JEM file

function pixelToUV(pixelU: number, pixelV: number): [number, number] {
  return [
    pixelU / textureSize[0],
    pixelV / textureSize[1]
  ];
}
```

**For allay body north face `[8, 48, 20, 64]`:**
```typescript
const uv = [
  [8/128, 48/128],   // Top-left:     [0.0625, 0.375]
  [20/128, 48/128],  // Top-right:    [0.15625, 0.375]
  [20/128, 64/128],  // Bottom-right: [0.15625, 0.5]
  [8/128, 64/128]    // Bottom-left:  [0.0625, 0.5]
];
```

### Mirror UV

```json
{
  "mirrorTexture": "u",
  "boxes": [...]
}
```

**Effect:** Horizontally flips UV coordinates (mirrors along U axis)

**Implementation:**
```typescript
if (mirrorUV) {
  // Flip U coordinates: u_new = 1 - u_old
  uv = uv.map(([u, v]) => [1 - u, v]);
}
```

**Use case:** Arms, legs, and other symmetric parts can share textures

**References:**
- [Blockbench optifine_jem.js:113-122](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L113-L122) - Box UV vs Per-Face UV detection (export)
- [Blockbench optifine_jem.js:288-289](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L288-L289) - Box UV parsing with textureOffset
- [Blockbench optifine_jem.js:312-330](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L312-L330) - Per-face UV parsing

---

## Three.js Rendering Pipeline

### From JEM to Three.js Mesh

The complete pipeline looks like this:

```
JEM File
  ↓
Parse Model Parts
  ↓
Create Three.js Groups (bones)
  ↓
Parse Boxes → Create BufferGeometry
  ↓
Apply UV Mapping
  ↓
Create Mesh with Material
  ↓
Apply Transforms & Animations
  ↓
Render
```

### Step 1: Parse and Create Group Hierarchy

```typescript
function buildBoneHierarchy(part: ParsedPart, parent?: THREE.Group): THREE.Group {
  const bone = new THREE.Group();
  bone.name = part.name;
  
  // Apply transform (note: origin is already negated from JEM translate)
  bone.position.set(part.origin[0], part.origin[1], part.origin[2]);
  bone.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
  bone.scale.setScalar(part.scale);
  
  // Build geometry for this bone's boxes
  if (part.boxes.length > 0) {
    const mesh = createMeshFromBoxes(part.boxes, texturePath);
    bone.add(mesh);
  }
  
  // Recursively add children
  for (const child of part.children) {
    const childBone = buildBoneHierarchy(child, bone);
    bone.add(childBone);
  }
  
  if (parent) parent.add(bone);
  return bone;
}
```

**Blockbench Implementation:**

After parsing JEM → Blockbench objects, the Three.js scene is built:

1. **Group Creation** - Groups become THREE.Group/THREE.Object3D nodes
2. **Transform Application** - [outliner.js:802-832](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/outliner.js#L802-L832)
   ```javascript
   updateTransform(element) {
     let mesh = element.mesh;
     mesh.position.set(element.origin[0], element.origin[1], element.origin[2])
     mesh.rotation.x = Math.degToRad(element.rotation[0]);
     mesh.rotation.y = Math.degToRad(element.rotation[1]);
     mesh.rotation.z = Math.degToRad(element.rotation[2]);
     
     // Parent-child setup for bone rigs
     if (Format.bone_rig) {
       if (element.parent instanceof OutlinerNode) {
         element.parent.mesh.add(mesh);
         // Adjust for absolute positioning
         mesh.position.x -= element.parent.origin[0];
         mesh.position.y -= element.parent.origin[1];
         mesh.position.z -= element.parent.origin[2];
       }
     }
   }
   ```

3. **Update All Bones** - [canvas.js:770-775](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/preview/canvas.js#L770-L775)
   ```javascript
   updateAllBones(bones = Group.all) {
     if (Project) Project.model_3d.scale.set(1, 1, 1);
     bones.forEach((obj) => {
       obj.preview_controller.updateTransform(obj);
     })
   }
   ```

4. **Group-Specific Transforms** - [group.js:619-624](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/group.js#L619-L624)
   ```javascript
   updateTransform(group) {
     NodePreviewController.prototype.updateTransform.call(this, group);
     let bone = group.scene_object;
     bone.scale.x = bone.scale.y = bone.scale.z = 1;
     bone.fix_position = bone.position.clone();
     bone.fix_rotation = bone.rotation.clone();
   }
   ```

### Step 2: Create Three.js Geometry from Boxes

For each box, we create 6 faces (quads, split into 2 triangles each = 12 triangles total).

**Example: North face of a box**

```typescript
// Box: from=[-1.5, 2, -1], to=[1.5, 6, 1]
// North face (facing negative Z)

const vertices = [
  // Triangle 1
  -1.5, 2, -1,   // Bottom-left
   1.5, 2, -1,   // Bottom-right
   1.5, 6, -1,   // Top-right
  
  // Triangle 2
   1.5, 6, -1,   // Top-right
  -1.5, 6, -1,   // Top-left
  -1.5, 2, -1    // Bottom-left
];

const normals = [
  0, 0, -1,  // All pointing in -Z direction
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1
];

// UVs from uvNorth: [8, 48, 20, 64]
const u1 = 8/128, v1 = 48/128;    // 0.0625, 0.375
const u2 = 20/128, v2 = 64/128;   // 0.15625, 0.5

const uvs = [
  u1, v2,  // Bottom-left
  u2, v2,  // Bottom-right
  u2, v1,  // Top-right
  u2, v1,  // Top-right
  u1, v1,  // Top-left
  u1, v2   // Bottom-left
];
```

**Blockbench Implementation:**

Geometry building happens in the Cube preview controller:

1. **Setup Mesh** - [cube.js:1095-1134](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js#L1095-L1134)
   ```javascript
   setup(element) {
     let mesh = new THREE.Mesh(new THREE.BufferGeometry(), Canvas.transparentMaterial);
     mesh.name = element.uuid;
     mesh.type = 'cube';
     mesh.geometry.setAttribute('highlight', new THREE.BufferAttribute(new Uint8Array(24).fill(0), 1));
     
     // Create outline
     let geometry = new THREE.BufferGeometry();
     let line = new THREE.Line(geometry, Canvas.outlineMaterial);
     mesh.outline = line;
     mesh.add(line);
     
     // Initial update
     this.updateTransform(element);
     this.updateGeometry(element);
     this.updateFaces(element);
     this.updateUV(element);
   }
   ```

2. **Update Geometry** - [cube.js:1154-1193](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js#L1154-L1193)
   ```javascript
   updateGeometry(element) {
     let mesh = element.mesh;
     var from = element.from.slice()
     var to = element.to.slice()
     
     // Adjust for inflate and stretch
     adjustFromAndToForInflateAndStretch(from, to, element);
     
     // Make positions relative to origin
     from.forEach((v, i) => {
       from[i] -= element.origin[i];
     })
     to.forEach((v, i) => {
       to[i] -= element.origin[i];
       if (from[i] === to[i]) {
         to[i] += 0.001  // Prevent zero-thickness
       }
     })
     
     // Build geometry
     mesh.geometry.setShape(from, to)
     mesh.geometry.computeBoundingBox()
     mesh.geometry.computeBoundingSphere()
   }
   ```

3. **Update Faces** - [cube.js:1195-1234](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js#L1195-L1234)
   ```javascript
   updateFaces(element) {
     let {mesh} = element;
     let indices = [];
     mesh.geometry.faces = [];
     mesh.geometry.clearGroups();
     
     // Build indices for each face (2 triangles = 6 indices)
     Canvas.face_order.forEach((fkey, i) => {
       if (element.faces[fkey].texture !== null) {
         indices.push(0 + i*4, 2 + i*4, 1 + i*4, 2 + i*4, 3 + i*4, 1 + i*4);
         mesh.geometry.addGroup(j*6, 6, j)
         mesh.geometry.faces.push(fkey)
       }
     })
     mesh.geometry.setIndex(indices)
   }
   ```

### Step 3: Create BufferGeometry

```typescript
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
```

### Step 4: Create Material and Mesh

```typescript
const texture = textureLoader.load(texturePath);
texture.magFilter = THREE.NearestFilter;  // Pixelated look
texture.minFilter = THREE.NearestFilter;

const material = new THREE.MeshStandardMaterial({
  map: texture,
  transparent: true,
  alphaTest: 0.1,
  side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
```

### Step 5: Apply Animation Transforms

During animation tick:

```typescript
function tick(deltaTime: number) {
  // Evaluate animation expressions
  const transforms = animationEngine.evaluate(deltaTime);
  
  // Apply to bones
  for (const [boneName, transform] of transforms) {
    const bone = bones.get(boneName);
    if (!bone) continue;
    
    // Additive transforms (relative to base position)
    bone.position.x = basePosition.x + transform.tx / 16;
    bone.position.y = basePosition.y + transform.ty / 16;
    bone.position.z = basePosition.z + transform.tz / 16;
    
    bone.rotation.x = baseRotation.x + transform.rx;
    bone.rotation.y = baseRotation.y + transform.ry;
    bone.rotation.z = baseRotation.z + transform.rz;
  }
  
  // CRITICAL: Update world matrices after all transforms
  modelGroup.updateMatrixWorld(true);
}
```

### Understanding World Matrix Updates

**Why `updateMatrixWorld(true)` is critical:**

```typescript
// Without updateMatrixWorld:
body.position.y = 6;
head.position.y = 0;  // Relative to body

console.log(head.getWorldPosition());
// → (0, 0, 0) ❌ WRONG! Uses stale matrix

// With updateMatrixWorld:
body.position.y = 6;
head.position.y = 0;
modelGroup.updateMatrixWorld(true);

console.log(head.getWorldPosition());
// → (0, 6, 0) ✅ CORRECT! Parent transform applied
```

**When Three.js updates matrices:**
- Automatically: During `renderer.render()` call
- Manually: When you call `object.updateMatrixWorld()`

**Our case:**
- We modify bone positions/rotations every frame
- We need world positions updated BEFORE rendering
- Solution: Call `modelGroup.updateMatrixWorld(true)` after applying all transforms

### Pixel to Three.js Unit Conversion

**Critical constant:**
```typescript
const PIXELS_PER_UNIT = 16;
```

**Why 16?**
- Minecraft's legacy: 16 pixels = 1 meter in game
- Box coordinates are in pixels
- Three.js uses arbitrary units (we treat as meters)

**Conversions:**
```typescript
// Animation translate values (in pixels) → Three.js position
bone.position.x = animationTx / 16;

// Box coordinates (already in pixels) → Three.js geometry
// No conversion needed, Three.js handles scale
```

---

## Complete Allay Example Walkthrough

Let's trace how the allay's body → head2 → eyes hierarchy is parsed.

### Level 0: Body (Root Part)

```json
{
  "part": "body",
  "id": "body",
  "translate": [0, -6, 0],
  "boxes": [
    {
      "coordinates": [-1.5, 2, -1, 3, 4, 2],
      "uvNorth": [8, 48, 20, 64],
      // ...
    }
  ],
  "submodels": [...]
}
```

**Parsing:**
- `depth = 0` (root part)
- `rawTranslate = [0, -6, 0]` (from JEM)
- No parent adjustment (depth is 0)
- `origin = -[0, -6, 0] = [0, 6, 0]` (Three.js position)

**Result:** Body is positioned at `[0, 6, 0]` in world space.

### Level 1: Body2 (First Submodel)

```json
{
  "id": "body2",
  "translate": [0, 4, 0],
  "boxes": [
    {
      "coordinates": [-1.5, -3, -1, 3, 5, 2],
      // ...
    }
  ]
}
```

**Parsing:**
- `depth = 1` (first level submodel)
- `rawTranslate = [0, 4, 0]` (from JEM)
- **Parent translate = [0, -6, 0]** (body's translate, NOT origin!)
- **Blockbench adjustment:** `rawTranslate += parentTranslate`
  ```
  [0, 4, 0] + [0, -6, 0] = [0, -2, 0]
  ```
- `origin = -[0, -2, 0] = [0, 2, 0]` (Three.js local position relative to body)

**Result:** Body2 is at `[0, 2, 0]` **relative to body**, which is `[0, 8, 0]` in world space.

### Level 1: Head2 (Another First-Level Submodel)

```json
{
  "id": "head2",
  "translate": [0, 6, 0],
  "boxes": [
    {
      "coordinates": [-2.5, 0, -2.5, 5, 5, 5],
      // ...
    }
  ],
  "submodels": [
    {
      "id": "left_eye",
      "translate": [-0.5, 1.9, -2.5],
      // ...
    }
  ]
}
```

**Parsing:**
- `depth = 1`
- `rawTranslate = [0, 6, 0]` (from JEM)
- **Parent translate = [0, -6, 0]** (body's translate)
- **Blockbench adjustment:**
  ```
  [0, 6, 0] + [0, -6, 0] = [0, 0, 0]
  ```
- `origin = -[0, 0, 0] = [0, 0, 0]` (Three.js local position relative to body)

**Result:** Head2 is at `[0, 0, 0]` relative to body, which is `[0, 6, 0]` in world space.

### Level 2: Left Eye (Second-Level Submodel)

```json
{
  "id": "left_eye",
  "translate": [-0.5, 1.9, -2.5],
  "boxes": [
    {
      "coordinates": [-1, -0.9, -0.05, 1, 2, 0.05],
      // ...
    }
  ]
}
```

**Parsing:**
- `depth = 2` (submodel of head2, which is itself a submodel)
- `rawTranslate = [-0.5, 1.9, -2.5]` (from JEM)
- **Parent translate = [0, 0, 0]** (head2's adjusted translate, not origin!)
- **Blockbench adjustment:**
  ```
  [-0.5, 1.9, -2.5] + [0, 0, 0] = [-0.5, 1.9, -2.5]
  ```
- `origin = -[-0.5, 1.9, -2.5] = [0.5, -1.9, 2.5]` (Three.js local position)

**Result:** Left eye is at `[0.5, -1.9, 2.5]` relative to head2.

### World Position Calculation

To find the eye's final world position:
```
eye_world = body_world + head2_local + eye_local
          = [0, 6, 0] + [0, 0, 0] + [0.5, -1.9, 2.5]
          = [0.5, 4.1, 2.5]
```

---

## Key Insight: The Translate Accumulation

**The critical rule:**
```javascript
if (depth >= 1 && parentTranslate) {
  childTranslate[0] += parentTranslate[0];
  childTranslate[1] += parentTranslate[1];
  childTranslate[2] += parentTranslate[2];
}
```

**What gets passed to children:**
- NOT the parent's `origin` (which is negated)
- The parent's **adjusted `rawTranslate`** (after its own parent adjustment)

This ensures that positions accumulate correctly through deep hierarchies.

---

## Fresh Animations Pattern

Looking at allay.jem's structure:

```json
{
  "id": "head2",
  "translate": [0, 6, 0],    // Offsets from body at [0, -6, 0]
  "boxes": [...],             // After adjustment: [0, 0, 0] relative to body
  "submodels": [
    {
      "id": "left_eye",
      "translate": [-0.5, 1.9, -2.5],  // Relative to head2
      // ...
    }
  ]
}
```

**Fresh Animations uses this pattern:**
1. Empty root bones at specific positions (like `head` at `[0, -6, 0]`)
2. Actual geometry in submodels (like `head2` with the head cube)
3. Feature parts as sub-submodels (like `left_eye`, `right_eye`)

This allows complex animations without affecting the base geometry structure.

---

## Attachment System

Allay also uses external JPM files:

```json
{
  "part": "body",
  "id": "head_part",
  "model": "allay_head.jpm",
  "attach": "true"
}
```

**What this means:**
- This creates an attachment point
- `head_part` should become a child of `body`
- The JPM file content is loaded separately
- Animations reference `head_part` to control this attached model

**Our implementation:**
```typescript
if (modelPart.attach) {
  const childId = modelPart.id || modelPart.part || "";
  const parentPart = modelPart.part || "";
  
  attachments.push({ childId, parentPart });
  // Later: make childId a child of parentPart in the hierarchy
}
```

---

## Summary: The Complete Parsing Flow

1. **Parse root model parts** (depth=0)
   - Use translate as-is
   - Negate to get Three.js origin

2. **Parse first-level submodels** (depth=1)
   - Add parent's translate to child's translate
   - Then negate for Three.js origin

3. **Parse deeper submodels** (depth≥2)
   - Continue accumulating parent translates
   - Each level adds its parent's (already adjusted) translate

4. **Build Three.js hierarchy**
   - Create groups with accumulated origins
   - Parent-child relationships are already correct
   - Animations work because bone positions are in the right coordinate space

---

## Common Mistakes

❌ **Passing parent's origin to children**
```typescript
// WRONG
children.push(parseModelPart(submodel, depth+1, origin))
```

✅ **Passing parent's adjusted translate to children**
```typescript
// CORRECT
children.push(parseModelPart(submodel, depth+1, rawTranslate))
```

❌ **Not accumulating at depth >= 1**
```typescript
// WRONG - always use translate as-is
const origin = [-translate[0], -translate[1], -translate[2]]
```

✅ **Accumulating when depth >= 1**
```typescript
// CORRECT
if (depth >= 1 && parentTranslate) {
  rawTranslate[0] += parentTranslate[0];
  rawTranslate[1] += parentTranslate[1];
  rawTranslate[2] += parentTranslate[2];
}
const origin = [-rawTranslate[0], -rawTranslate[1], -rawTranslate[2]]
```

---

## Blockbench Code Flow Summary

Here's the complete parsing flow in Blockbench with code references:

### Parse Flow (JEM → Three.js)

1. **Entry Point**: `parse(model, path)` - [optifine_jem.js:207](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L207)
2. **Texture Setup**: Import textures and set sizes - [optifine_jem.js:239-248](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L239-L248)
3. **Process Each Model**: Loop through `model.models` - [optifine_jem.js:251-365](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L251-L365)
4. **Create Root Group**: With origin negation - [optifine_jem.js:264-275](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L264-L275)
5. **Read Content Recursively**: `readContent(submodel, p_group, depth, texture)` - [optifine_jem.js:277-361](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L277-L361)

### Critical Parsing Operations

**Box Coordinates** - [optifine_jem.js:299-310](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L299-L310)
```javascript
from: [box.coordinates[0], box.coordinates[1], box.coordinates[2]]
to: [
  box.coordinates[0] + box.coordinates[3],
  box.coordinates[1] + box.coordinates[4],
  box.coordinates[2] + box.coordinates[5]
]
```

**Box UV Parsing** - [optifine_jem.js:312-330](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L312-L330)
```javascript
if (!box.textureOffset && (box.uvNorth || box.uvEast || ...)) {
  // Per-face UV
  faces: {
    north: box.uvNorth ? {uv: box.uvNorth} : empty_face,
    // ...
  }
}
```

**Box Position Adjustment** - [optifine_jem.js:332-337](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L332-L337)
```javascript
if (p_group && (p_group.parent !== 'root' || model._is_jpm)) {
  for (var i = 0; i < 3; i++) {
    base_cube.from[i] += p_group.origin[i];
    base_cube.to[i] += p_group.origin[i];
  }
}
```

**Submodel Translate Accumulation** - [optifine_jem.js:343-347](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L343-L347)
```javascript
if (depth >= 1 && subsub.translate) {
  subsub.translate[0] += p_group.origin[0];
  subsub.translate[1] += p_group.origin[1];
  subsub.translate[2] += p_group.origin[2];
}
```

**Create Child Group** - [optifine_jem.js:349-357](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L349-L357)
```javascript
let group = new Group({
  name: subsub.id || subsub.comment || `${b.part??'part'}_sub_${subcount}`,
  origin: subsub.translate || (depth >= 1 ? submodel.translate : undefined),
  rotation: subsub.rotate,
  mirror_uv: (subsub.mirrorTexture && subsub.mirrorTexture.includes('u')),
  texture: (sub_texture || texture)?.uuid,
})
```

### Export Flow (Three.js → JEM)

**Compile Entry** - [optifine_jem.js:14-194](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L14-L194)

**Root Bone Creation** - [optifine_jem.js:48-56](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L48-L56)
```javascript
var bone = {
  part: g.name,
  id: g.name,
  invertAxis: 'xy',
  mirrorTexture: undefined,
  translate: g.origin.slice()
}
bone.translate.V3_multiply(-1);  // Negate back to JEM coordinates
```

**Submodel Export (SUBTRACT parent)** - [optifine_jem.js:163-166](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L163-L166)
```javascript
if (depth >= 1) {
  bone.translate[0] -= group.origin[0];  // SUBTRACT (inverse of import)
  bone.translate[1] -= group.origin[1];
  bone.translate[2] -= group.origin[2];
}
```

## Key Verification Results

✅ **Coordinate System**: Confirmed translate negation - [L273](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L273)  
✅ **Depth Rule**: Confirmed depth >= 1 adjustment - [L343-347](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L343-L347)  
✅ **Box Positioning**: Confirmed box coordinate adjustment - [L332-337](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L332-L337)  
✅ **UV Systems**: Confirmed box_uv vs per-face detection - [L312-330](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L312-L330)  
✅ **JPM Integration**: Confirmed `_is_jpm` flag usage - [L264](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L264), [L332](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L332)  
✅ **Export/Import Inverse**: Confirmed subtract on export, add on import - [L163-166](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L163-L166) vs [L343-347](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js#L343-L347)

## Complete Blockbench File Reference

### Parsing (JEM → Blockbench Objects)

| File | Purpose | Key Functions |
|------|---------|---------------|
| [optifine_jem.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js) | Main JEM parser | `parse()` [L207], `readContent()` [L277], depth accumulation [L343-347] |
| [optifine_jpm.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jpm.js) | JPM (single part) parser | `parse()` [L33], wraps JPM as JEM with `_is_jpm` flag |

### Outliner (Blockbench Data Model)

| File | Purpose | Key Functions |
|------|---------|---------------|
| [outliner.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/outliner.js) | Base outliner node | `updateTransform()` [L802], parent-child setup [L821-827] |
| [group.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/group.js) | Group/bone container | `updateTransform()` [L619], stores `fix_position` and `fix_rotation` |
| [cube.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js) | Cube element | `getMesh()` [L321], geometry from `from`/`to` coordinates |

### Three.js Rendering (Blockbench Objects → Scene)

| File | Purpose | Key Functions |
|------|---------|---------------|
| [canvas.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/preview/canvas.js) | Canvas and rendering control | `updateAllBones()` [L770], triggers transform updates |
| [cube.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js) | Cube mesh generation | `setup()` [L1095], `updateGeometry()` [L1154], `updateFaces()` [L1195] |

### Complete Flow

```
JEM File
  ↓
[optifine_jem.js] parse()
  ↓ Creates Blockbench objects (Group, Cube)
  ↓ Applies depth >= 1 translate accumulation [L343-347]
  ↓
[Group/Cube objects in outliner]
  ↓
[canvas.js] updateAllBones()
  ↓
[outliner.js] updateTransform() - Sets position/rotation
  ↓
[cube.js] updateGeometry() - Builds BufferGeometry
  ↓
[cube.js] updateFaces() - Sets up face indices
  ↓
[THREE.Mesh with BufferGeometry]
  ↓
Rendered in Three.js scene
```

## References

**Blockbench Source Files:**
- Main JEM Parser: [optifine_jem.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jem.js)
- JPM Parser: [optifine_jpm.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/io/formats/optifine_jpm.js)
- Outliner Base: [outliner.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/outliner.js)
- Group Handling: [group.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/group.js)
- Cube Geometry: [cube.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/outliner/cube.js)
- Canvas/Rendering: [canvas.js](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/blockbench/js/preview/canvas.js)

**Example Files:**
- Fresh Animations Allay: [allay.jem](file:///Users/nicholaswillette/Repos/Weaverbird/__mocks__/resourcepacks/FreshAnimations_v1.9.2/assets/minecraft/optifine/cem/allay.jem)

**Our Implementation:**
- JEM Loader: [src/lib/emf/jemLoader.ts](file:///Users/nicholaswillette/Repos/Weaverbird/src/lib/emf/jemLoader.ts)
- Bone Controller: [src/lib/emf/animation/boneController.ts](file:///Users/nicholaswillette/Repos/Weaverbird/src/lib/emf/animation/boneController.ts)
- Animation Engine: [src/lib/emf/animation/AnimationEngine.ts](file:///Users/nicholaswillette/Repos/Weaverbird/src/lib/emf/animation/AnimationEngine.ts)
