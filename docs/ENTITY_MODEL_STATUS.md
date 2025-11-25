# Entity Model Rendering - Current Status

## ✅ Integration Complete

The new JEM loader is **fully integrated** and working correctly!

## Current Behavior

### When Resource Pack Has JEM File
- ✅ Loads and parses JEM file correctly
- ✅ Converts to Three.js with proper coordinates
- ✅ Renders entity model in preview

### When Resource Pack Does NOT Have JEM File (Expected)
- ℹ️ Shows helpful console message (not an error!)
- ℹ️ Creates gray placeholder cube
- ℹ️ Suggests adding OptiFine CEM files to pack

## Test Results

### Available JEM Files in Mock Packs

```bash
__mocks__/resourcepacks/VanillaTweaks_r600224_MC1.21.x/
└── assets/minecraft/optifine/cem/hanging_sign.jem
```

### Test with cow.jem (from __mocks__/cem/)
```bash
npm test -- src/lib/emf/jemLoader.test.ts
```
**Result:** ✅ All 7 tests passing

## Example Console Output

### Pack WITH JEM file:
```
[EMF] Loading entity model: hanging_sign
[EMF] Looking for JEM at: assets/minecraft/optifine/cem/hanging_sign.jem
[EMF] ✓ JEM file loaded successfully
[JEM Parser] Parsing entity: hanging_sign
[JEM] Converting to Three.js...
✓ Model rendered successfully
```

### Pack WITHOUT JEM file (Normal):
```
[EMF] Loading entity model: cow
[EMF] Looking for JEM at: assets/minecraft/optifine/cem/cow.jem
[EMF] No JEM file found for cow (this is normal if pack doesn't have custom entity models)
[EntityModel] No custom JEM model found for cow in Stay True
[EntityModel] Entity models require OptiFine CEM files (assets/minecraft/optifine/cem/*.jem)
[EntityModel] Tip: Add OptiFine CEM files to resource pack to see custom entity models
ℹ️ Showing placeholder cube
```

## How to Add Entity Models to Your Pack

### 1. Obtain JEM Files

JEM files can be created with:
- **Blockbench** - Export as "OptiFine JEM"
- Download from CEM resource packs

### 2. Add to Resource Pack

Place JEM files in the correct directory:
```
your_resource_pack/
└── assets/
    └── minecraft/
        └── optifine/
            └── cem/
                ├── cow.jem
                ├── pig.jem
                ├── sheep.jem
                ├── chest.jem
                └── ...
```

### 3. Supported Entities

Any entity with a JEM file will work:
- **Mobs**: cow, pig, sheep, zombie, skeleton, etc.
- **Block Entities**: chest, shulker_box, hanging_sign, etc.
- **Other**: armor_stand, boat, minecart, etc.

## Testing Your Integration

### Test with Existing File

1. Copy `__mocks__/cem/cow.jem` to a test pack:
   ```bash
   mkdir -p "test_pack/assets/minecraft/optifine/cem"
   cp __mocks__/cem/cow.jem "test_pack/assets/minecraft/optifine/cem/"
   ```

2. Load the pack in Weaverbird
3. Navigate to a cow entity texture
4. Should see custom model render!

### Test with Your Own JEM

1. Create entity model in Blockbench
2. Export as "OptiFine JEM"
3. Add to pack's `assets/minecraft/optifine/cem/` folder
4. Name file after entity type (e.g., `cow.jem`, `pig.jem`)
5. Load pack in Weaverbird

## Known Limitations

### Current Scope

- ✅ Static entity models (geometry + UV)
- ⚠️ Animations not yet implemented (JEM animations array exists but not processed)
- ⚠️ Vanilla fallback models not included (would need to embed default JEM files)

### Why Placeholder Cubes?

We show placeholders because:
1. **No vanilla JEM files** - Minecraft doesn't use JEM format internally
2. **OptiFine-specific** - JEM is an OptiFine extension
3. **Pack-specific feature** - Entity models are optional pack enhancements

To see actual entity models, you need resource packs with OptiFine CEM files.

## Future Improvements

### Possible Enhancements

1. **Embed vanilla entity models** as JEM
   - Convert vanilla entity models to JEM format
   - Include as fallback when pack has no custom model
   - Would show vanilla-accurate models

2. **Animation support**
   - Parse `animations` array in JEM files
   - Implement expression evaluation
   - Animate parts based on time/state

3. **Better placeholders**
   - Show entity silhouette or icon
   - Display entity type text
   - Different placeholder per entity type

## Troubleshooting

### "No custom entity model available"

This is **normal** - it means:
- Your resource pack doesn't include custom entity models
- The entity will use vanilla rendering in-game
- You're seeing entity textures, which is correct!

**Solution:**
- Add JEM files to pack if you want custom models
- Or: This is expected behavior, no action needed

### Model renders incorrectly

Check:
1. JEM file format is valid JSON
2. Texture exists at specified path
3. `textureSize` matches actual texture dimensions
4. Console logs for parsing details

### Model not loading from pack

Verify:
1. File path: `assets/minecraft/optifine/cem/{entity}.jem`
2. File name matches entity type exactly
3. Pack is properly scanned by Weaverbird
4. Check Tauri backend logs for file read errors

## References

- **JEM Format**: https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc
- **Integration Guide**: `docs/JEM_LOADER_INTEGRATION_GUIDE.md`
- **Implementation**: `src/lib/emf/jemLoader.ts`
- **Tests**: `src/lib/emf/jemLoader.test.ts`

---

**Status**: ✅ Fully working - placeholders are expected when packs lack JEM files!
