# Block Tinting Verification Report

This document verifies that all tinting implementations correctly use the vanilla block colors registry.

## Summary

✅ **MinecraftCSSBlock (2D CSS Renderer)** - CORRECT
❓ **Preview3D/BlockModel (3D WebGL Renderer)** - NEEDS REVIEW

## Detailed Analysis

### ✅ MinecraftCSSBlock (src/components/MinecraftCSSBlock/index.tsx)

**Status:** Correctly implemented

**How it works:**
1. Checks `face.tintindex` from model JSON (IF tinting should occur)
2. Calls `getColormapType(textureId)` which:
   - Converts texture ID to block ID
   - Calls `getBlockTintType(blockId)` from the registry
   - Returns "grass" or "foliage" based on the static constants
3. Only applies tint if BOTH conditions are true

**Code:**
```typescript
const shouldTint = face.tintindex !== undefined && face.tintindex !== null;
const tintType = shouldTint && textureId ? getColormapType(textureId) : undefined;
```

**Verdict:** ✅ Uses the vanilla block colors registry correctly

---

### ❓ Preview3D/BlockModel (src/components/Preview3D/BlockModel.tsx)

**Status:** Partially correct, but has a misleading heuristic

**How it works:**
1. Scans model elements for `tintindex` values
2. Collects all tintindex values into a Set
3. Uses hardcoded heuristic to determine tint type:
   ```typescript
   const tintType = tintIndices.has(1)
     ? "foliage"
     : tintIndices.has(0)
       ? "grass"
       : undefined;
   ```
4. Reports this via `onTintDetected` callback
5. Parent component (Preview3D) decides which `biomeColor` to pass

**Issues:**
- The heuristic `tintindex: 1 = foliage, tintindex: 0 = grass` is **incorrect**
- In Minecraft, BOTH grass and foliage blocks typically use `tintindex: 0`
- `tintindex` just means "apply tinting", not which colormap
- **HOWEVER**: This code is only for detection/reporting, not for actual tinting

**Architecture:**
The actual tinting decision is made by the parent component:
1. Preview3D component receives `assetId` and `biomeColor` as props
2. It passes `biomeColor` down to BlockModel
3. BlockModel applies whatever color it receives
4. The parent determines which color based on the asset/colormap type

**Verdict:** ❓ Works but has incorrect assumptions. The tintindex heuristic should be replaced with a proper check against the block colors registry.

---

## Recommendation

### For Preview3D/BlockModel

Replace the tintindex heuristic with a proper block ID check:

**Current (incorrect):**
```typescript
const tintType = tintIndices.has(1)
  ? "foliage"
  : tintIndices.has(0)
    ? "grass"
    : undefined;
```

**Should be:**
```typescript
import { getBlockTintType } from "@/constants/vanillaBlockColors";

// Extract block ID from assetId
const blockId = extractBlockIdFromAsset(assetId);
const tintType = hasTintindex ? getBlockTintType(blockId) : undefined;
```

This way:
1. We check if ANY tintindex exists (hasTintindex)
2. Then check which colormap the BLOCK uses (not the tintindex value)
3. Report accurate tint type to parent

### Implementation Steps

1. Add import: `import { getBlockTintType } from "@/constants/vanillaBlockColors";`
2. Extract block ID from assetId (e.g., "minecraft:block/oak_leaves" → "minecraft:oak_leaves")
3. Replace heuristic with: `getBlockTintType(blockId)`
4. Keep the hasTintindex check for detecting IF tinting is needed
5. Test with oak leaves, grass blocks, birch leaves, crimson planks

---

## Test Cases

To verify correct behavior:

| Block | tintindex? | Registry Says | Expected Result |
|-------|-----------|---------------|-----------------|
| oak_leaves | Yes (0) | foliage | ✅ Tinted with foliage |
| grass_block | Yes (0) | grass | ✅ Tinted with grass |
| birch_leaves | Yes (0) | undefined (fixed) | ✅ NOT tinted |
| lily_pad | Yes (0) | foliage | ✅ Tinted with foliage |
| crimson_planks | No | undefined | ✅ NOT tinted |
| redstone_wire | Yes (0) | special | ⚠️ Special case |

---

## Files to Check

- [x] `src/components/MinecraftCSSBlock/index.tsx` - ✅ CORRECT
- [ ] `src/components/Preview3D/BlockModel.tsx` - ❓ NEEDS UPDATE
- [ ] `src/lib/three/modelConverter.ts` - ✅ Receives color, doesn't decide
- [ ] `src/components/Preview3D/index.tsx` - ✅ Decides which color to pass

---

## Conclusion

**MinecraftCSSBlock** is correctly implemented and uses the registry.

**Preview3D/BlockModel** works but should be updated to use the registry instead of the tintindex heuristic. The current implementation may incorrectly report tint types, though the actual rendering might still work if the parent makes the right decision.

**Priority:** Medium - The 3D renderer should be updated to match the 2D renderer's approach for consistency and accuracy.
