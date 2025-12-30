/**
 * Texture loading utilities for Minecraft resource packs
 */
import * as THREE from "three";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

// Cache textures to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

// Track animated textures for animation updates
interface AnimatedTextureInfo {
  texture: THREE.Texture;
  frameCount: number;
  frametime: number; // Minecraft ticks per frame (1 tick = 50ms)
  currentFrame: number;
  lastUpdateTime: number;
  interpolate: boolean; // Whether to smoothly fade between frames
  material?: THREE.ShaderMaterial; // Custom shader material for interpolation
}

const animatedTextures = new Map<THREE.Texture, AnimatedTextureInfo>();

/**
 * List of textures that should NOT use interpolation
 * These textures don't have "interpolate": true in their .mcmeta files
 */
const NON_INTERPOLATING_TEXTURES = new Set([
  "seagrass",
  "tall_seagrass_top",
  "tall_seagrass_bottom",
  "kelp",
  "kelp_plant",
  // Add more as discovered
]);

/**
 * Check if a texture should use interpolation based on its name
 */
function shouldInterpolate(textureId: string): boolean {
  // Extract the base texture name (without path and namespace)
  const textureName =
    textureId
      .split("/")
      .pop()
      ?.replace(/\.png$/i, "") || "";
  return !NON_INTERPOLATING_TEXTURES.has(textureName);
}

/**
 * Create a custom shader material for animated texture interpolation
 * Uses MeshStandardMaterial with onBeforeCompile to preserve lighting behavior
 */
function createAnimatedTextureMaterial(
  texture: THREE.Texture,
  frameCount: number,
): THREE.ShaderMaterial {
  // Clone the texture so we can modify its properties without affecting the original
  const clonedTexture = texture.clone();
  clonedTexture.needsUpdate = true;

  // Reset repeat and offset since we'll handle animation in the shader
  clonedTexture.repeat.set(1, 1);
  clonedTexture.offset.set(0, 0);

  // Use MeshStandardMaterial as base to get exact same lighting as non-animated blocks
  const material = new THREE.MeshStandardMaterial({
    map: clonedTexture,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  // Inject custom animation shader code into the standard material
  material.onBeforeCompile = (shader) => {
    // Add custom uniforms for animation
    shader.uniforms.frameCount = { value: frameCount };
    shader.uniforms.currentFrame = { value: 0 };
    shader.uniforms.blendFactor = { value: 0.0 };

    // Store reference to shader uniforms for updates
    (material as any).userData.animUniforms = shader.uniforms;

    // Add uniform declarations to fragment shader
    shader.fragmentShader = `
      uniform float frameCount;
      uniform float currentFrame;
      uniform float blendFactor;
      ${shader.fragmentShader}
    `;

    // Replace the texture sampling with custom frame blending
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
        // Custom animated texture sampling with frame blending
        float frameHeight = 1.0 / frameCount;
        float currentFrameV = (frameCount - 1.0 - currentFrame) / frameCount;
        float nextFrameIndex = mod(currentFrame + 1.0, frameCount);
        float nextFrameV = (frameCount - 1.0 - nextFrameIndex) / frameCount;

        // Sample current frame
        vec2 currentUv = vMapUv;
        currentUv.y = currentFrameV + currentUv.y * frameHeight;
        vec4 currentColor = texture2D(map, currentUv);

        // Sample next frame
        vec2 nextUv = vMapUv;
        nextUv.y = nextFrameV + nextUv.y * frameHeight;
        vec4 nextColor = texture2D(map, nextUv);

        // Blend between frames
        vec4 sampledDiffuseColor = mix(currentColor, nextColor, blendFactor);

        #ifdef DECODE_VIDEO_TEXTURE
          sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
        #endif
        diffuseColor *= sampledDiffuseColor;
      `,
    );
  };

  // Cast to ShaderMaterial type for compatibility with existing code
  return material as unknown as THREE.ShaderMaterial;
}

/**
 * Update all animated textures
 * Should be called in the render loop
 */
export function updateAnimatedTextures(currentTime: number): void {
  animatedTextures.forEach((info) => {
    const elapsedMs = currentTime - info.lastUpdateTime;
    const frameTimeMs = info.frametime * 50; // Minecraft tick = 50ms

    if (info.interpolate && info.material) {
      // Shader-based interpolation: blend between frames
      const progress = Math.min(elapsedMs / frameTimeMs, 1.0);

      if (progress >= 1.0) {
        // Advance to next frame
        info.currentFrame = (info.currentFrame + 1) % info.frameCount;
        info.lastUpdateTime = currentTime;
      }

      // Update shader uniforms (stored in userData by onBeforeCompile)
      const animUniforms = (info.material as any).userData?.animUniforms;
      if (animUniforms) {
        const actualProgress =
          (currentTime - info.lastUpdateTime) / frameTimeMs;
        animUniforms.currentFrame.value = info.currentFrame;
        animUniforms.blendFactor.value = Math.min(actualProgress, 1.0);
      }
    } else {
      // Instant frame switching (no interpolation)
      if (elapsedMs >= frameTimeMs) {
        // Advance to next frame
        info.currentFrame = (info.currentFrame + 1) % info.frameCount;
        info.lastUpdateTime = currentTime;

        // Update texture offset to show current frame
        const offset =
          (info.frameCount - 1 - info.currentFrame) / info.frameCount;
        info.texture.offset.set(0, offset);
        info.texture.needsUpdate = true;
      }
    }
  });
}

/**
 * Load a texture from a resource pack
 *
 * @param packPath - Path to the resource pack
 * @param textureId - Texture ID (e.g., "minecraft:block/dirt")
 * @param isZip - Whether the pack is a ZIP file
 * @returns Three.js Texture or null if not found
 */
export async function loadPackTexture(
  packPath: string,
  textureId: string,
  isZip: boolean,
  versionFolders?: string[] | null,
): Promise<THREE.Texture | null> {
  console.log(`=== [textureLoader] Loading Pack Texture ===`);
  console.log(`[textureLoader] Texture ID: ${textureId}`);
  console.log(`[textureLoader] Pack path: ${packPath}`);
  console.log(`[textureLoader] Is ZIP: ${isZip}`);

  // Check cache first
  const cacheKey = `${packPath}:${textureId}`;
  if (textureCache.has(cacheKey)) {
    console.log(`[textureLoader] ✓ Texture found in cache: ${textureId}`);
    return textureCache.get(cacheKey)!;
  }

  try {
    // Get the file path from Tauri backend
    console.log(`[textureLoader] → Requesting texture path from backend...`);
    const texturePath = await invoke<string>("get_pack_texture_path", {
      packPath,
      assetId: textureId,
      isZip,
      versionFolders: versionFolders ?? undefined,
    });

    console.log(`[textureLoader] ✓ Backend returned path: ${texturePath}`);

    // Convert to a URL that can be loaded in the browser
    const textureUrl = convertFileSrc(texturePath);
    console.log(`[textureLoader] ✓ Converted to browser URL: ${textureUrl}`);

    // Load the texture first, then check for animation
    console.log(`[textureLoader] → Loading texture from URL...`);
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (tex) => {
          console.log(
            `[textureLoader] ✓ Texture loaded successfully: ${textureId}`,
          );
          // Configure texture for Minecraft-style rendering
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace; // Ensure correct color interpretation

          // Check if texture is animated based on image dimensions
          if (tex.image) {
            const width = tex.image.width;
            const height = tex.image.height;

            // Animated textures have height > width and height evenly divisible by width
            const isAnimated = height > width && height % width === 0;

            if (isAnimated) {
              const frameCount = height / width;
              console.log(
                `[textureLoader] ✓ Animated texture detected: ${frameCount} frames (${width}x${height})`,
              );

              // Apply animation frame cropping
              // V coordinates need to be scaled: repeat by 1/frameCount, offset to top frame
              tex.repeat.set(1, 1 / frameCount);
              tex.offset.set(0, (frameCount - 1) / frameCount);

              // Register for animation updates
              // Default: 8 ticks per frame (most vanilla animated blocks use 2-10)
              // Magma uses 8 with interpolation, lava_still uses 20, water_still uses 2
              // Without .mcmeta files, we use reasonable defaults
              const interpolate = shouldInterpolate(textureId);
              const material = interpolate
                ? createAnimatedTextureMaterial(tex, frameCount)
                : undefined;

              animatedTextures.set(tex, {
                texture: tex,
                frameCount,
                frametime: 8, // TODO: Load from .mcmeta file for accurate timing
                currentFrame: 0,
                lastUpdateTime: performance.now(),
                interpolate,
                material,
              });

              console.log(
                `[textureLoader] → Registered animated texture: ${frameCount} frames @ 1 tick/frame`,
              );
            }
          }

          resolve(tex);
        },
        (progress) => {
          console.log(`[textureLoader] Loading progress:`, progress);
        },
        (error) => {
          console.error(
            `[textureLoader] ✗ THREE.TextureLoader error for ${textureId}:`,
            error,
          );
          reject(error);
        },
      );
    });

    // Cache the texture
    textureCache.set(cacheKey, texture);
    console.log(`[textureLoader] ✓ Texture cached`);
    console.log(`===========================================`);
    return texture;
  } catch (error) {
    console.error(`=== [textureLoader] Texture Load FAILED ===`);
    console.error(`[textureLoader] Texture ID: ${textureId}`);
    console.error(`[textureLoader] Error:`, error);
    console.error(`===========================================`);
    return null;
  }
}

/**
 * Load vanilla Minecraft texture
 *
 * @param textureId - Texture ID (e.g., "minecraft:block/dirt")
 * @returns Three.js Texture or null if not found
 */
export async function loadVanillaTexture(
  textureId: string,
): Promise<THREE.Texture | null> {
  const cacheKey = `vanilla:${textureId}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  try {
    // Get the vanilla texture path from Tauri backend
    const texturePath = await invoke<string>("get_vanilla_texture_path", {
      assetId: textureId,
    });

    // Convert to a URL that can be loaded in the browser
    const textureUrl = convertFileSrc(texturePath);

    // Load the texture
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (tex) => {
          // Configure texture for Minecraft-style rendering
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace; // Ensure correct color interpretation

          // Check if texture is animated based on image dimensions
          if (tex.image) {
            const width = tex.image.width;
            const height = tex.image.height;

            // Animated textures have height > width and height evenly divisible by width
            const isAnimated = height > width && height % width === 0;

            if (isAnimated) {
              const frameCount = height / width;
              console.log(
                `[textureLoader] ✓ Animated vanilla texture: ${textureId} (${frameCount} frames, ${width}x${height})`,
              );

              // Apply animation frame cropping
              tex.repeat.set(1, 1 / frameCount);
              tex.offset.set(0, (frameCount - 1) / frameCount);

              // Register for animation updates
              // Default: 8 ticks per frame (reasonable default for most blocks)
              const interpolate = shouldInterpolate(textureId);
              const material = interpolate
                ? createAnimatedTextureMaterial(tex, frameCount)
                : undefined;

              animatedTextures.set(tex, {
                texture: tex,
                frameCount,
                frametime: 8,
                currentFrame: 0,
                lastUpdateTime: performance.now(),
                interpolate,
                material,
              });
            }
          }

          resolve(tex);
        },
        undefined,
        (error) => {
          console.error(
            `[textureLoader] Failed to load vanilla texture ${textureId}:`,
            error,
          );
          reject(error);
        },
      );
    });

    // Cache the texture
    textureCache.set(cacheKey, texture);
    return texture;
  } catch (error) {
    console.error(
      `[textureLoader] Error loading vanilla texture ${textureId}:`,
      error,
    );
    return null;
  }
}

/**
 * Create a texture loader function for a specific pack
 *
 * @param packPath - Path to the resource pack
 * @param isZip - Whether the pack is a ZIP file
 * @param variantNumber - Optional variant number to append to texture paths (for ETF-style variants)
 * @returns Function that loads textures from this pack with vanilla fallback
 */
export function createTextureLoader(
  packPath: string,
  isZip: boolean,
  variantNumber?: string | null,
): (textureId: string) => Promise<THREE.Texture | null> {
  return async (textureId: string) => {
    console.log(`[textureLoader] createTextureLoader called for: ${textureId}`);

    // Apply variant number to texture path if provided (ETF-style variants)
    // BUT only if the texture path doesn't already have a variant number
    let actualTextureId = textureId;
    if (variantNumber) {
      // Check if texture already ends with a number (indicating it's already a variant)
      const hasVariantNumber = /\d+$/.test(textureId);

      if (!hasVariantNumber) {
        // Append variant number to the texture path
        // E.g., "block/allium" + "3" -> "block/allium3"
        actualTextureId = `${textureId}${variantNumber}`;
        console.log(
          `[textureLoader] Applying variant suffix: ${textureId} -> ${actualTextureId}`,
        );
      } else {
        console.log(
          `[textureLoader] Texture already has variant number, not applying suffix: ${textureId}`,
        );
      }
    }

    // Try loading from the pack first
    console.log(`[textureLoader] Attempting pack texture load...`);
    let texture = await loadPackTexture(packPath, actualTextureId, isZip);

    // If variant texture failed and we applied a variant suffix, try without it
    // This handles cases like grass_block_side which don't have variants
    if (!texture && variantNumber && actualTextureId !== textureId) {
      console.log(
        `[textureLoader] Variant texture failed, trying base texture: ${textureId}`,
      );
      texture = await loadPackTexture(packPath, textureId, isZip);
    }

    // Fall back to vanilla if not found
    if (!texture) {
      console.log(
        `[textureLoader] Pack texture failed, trying vanilla fallback...`,
      );
      texture = await loadVanillaTexture(actualTextureId);

      // Also try vanilla without variant suffix
      if (!texture && variantNumber && actualTextureId !== textureId) {
        texture = await loadVanillaTexture(textureId);
      }

      if (texture) {
        console.log(`[textureLoader] ✓ Vanilla texture loaded successfully`);
      } else {
        console.error(
          `[textureLoader] ✗ All texture load attempts failed for ${actualTextureId}`,
        );
      }
    }

    return texture;
  };
}

/**
 * Get animation info for a texture
 * Returns material if the texture uses interpolation
 */
export function getAnimationMaterial(
  texture: THREE.Texture,
): THREE.ShaderMaterial | null {
  const info = animatedTextures.get(texture);
  return info?.material ?? null;
}

/**
 * Check if a texture is animated
 */
export function isTextureAnimated(texture: THREE.Texture): boolean {
  return animatedTextures.has(texture);
}

/**
 * Clear the texture cache
 */
export function clearTextureCache(): void {
  // Dispose all textures
  for (const texture of textureCache.values()) {
    texture.dispose();
    animatedTextures.delete(texture);
  }
  textureCache.clear();
}

/**
 * Remove a specific texture from cache
 */
export function uncacheTexture(packPath: string, textureId: string): void {
  const cacheKey = `${packPath}:${textureId}`;
  const texture = textureCache.get(cacheKey);
  if (texture) {
    texture.dispose();
    animatedTextures.delete(texture);
    textureCache.delete(cacheKey);
  }
}
