# Weaverbird Agent Context

## Project context
- We are working in the Weaverbird repo, a Tauri app whose main goal is a 100% accurate Minecraft texture and model viewer and resource pack combiner.
- Goal: 100% data-driven rendering. All rendering details (geometry, textures, UV maps, particle generation, animations, and block states) are derived from resource pack data or the Minecraft JAR.

## Data-driven priority
- When fixing bugs or analyzing systems, if a hardcoded path could be data-driven, propose a new flow that infers it from blockstate JSON, .mcmeta, block lists/registry, JEM/JPM files, or the Minecraft JAR.

## Generated data integrity
- Never manually edit generated data or caches (particle physics/emissions caches, generated TypeScript constants, or any file marked auto-generated).
- If generated data is wrong, fix the extractor, clear caches, regenerate, and re-test across versions.
- Avoid manual overrides that only work for one Minecraft version or mod loader.

## Universal block handling
- Prefer blockstate properties over block names. Use names only when no property exists or truly special rendering is required.
- Check blockstate schemas first and apply property-based defaults (axis=y, face=floor, facing=down, etc.) before resolution.

## Obfuscated extraction workflow
- Rust extractors must parse obfuscated CFR output, not deobfuscated source.
- Deobfuscate only to understand patterns, then write regex against obfuscated names using Mojang field mappings.
- Do not apply mappings or deobfuscate during extraction runs.
- If manual decompile is needed for context, keep it minimal and prefer the same decompiler flow used by extractors.

## Manual JAR decompile (for quick reference only)
- Locate the target Minecraft JAR (launcher install dir) and the cached CFR jar at `~/Library/Caches/weaverbird/tools/cfr.jar`.
- Use Mojang mappings (cached by extractors) to find the obfuscated class name you need.
- Decompile just that class:
  - `java -jar ~/Library/Caches/weaverbird/tools/cfr.jar <path-to-jar> --outputdir /tmp/weaverbird_decompile net.minecraft.YourClass`
- Read the single output file to understand patterns, then translate to obfuscated-regex using field mappings.

## Core flows (Rust derivation layer to rendering)
- Resource pack scan -> asset index -> UI asset list and selection.
- Blockstate resolution (Rust) -> model JSON(s) -> Three.js conversion -> 3DPreview rendering.
- Blockstate resolution (Rust) -> model JSON(s) -> CSS geometry mapping -> MinecraftCSSBlock rendering.
- Texture resolution (pack + vanilla fallback) -> .png + .mcmeta -> UV mapping and animation frames -> 3DPreview or MinecraftCSSBlock.
- Particle extraction from Minecraft JAR (physics + emissions + textures) -> generated TypeScript -> ParticleEngine/Emitter -> 3D particle rendering.
- Animation extraction from Minecraft JAR + resource pack JEM/JPM -> AnimationEngine -> entity/block animation playback.
- Pack merge/build (Rust weaver_nest) -> exported resource pack.

## General instructions
- Keep code concise and DRY, reuse existing systems when possible.
- Avoid overly verbose comments and avoid creating needless md files.
- When multiple solutions exist, ask the user which approach fits best (use askuserquestion tool if available).
- Prefer larger, foundational fixes over patches or bandaids.
- Prefer automated tests (Jest / Rust tests) over manual testing when possible.
- For larger fixes, create and maintain a TODO list during the work.
