/**
 * Animated texture material and setup utilities
 */
import * as THREE from "three";
import {
  buildAnimationTimeline,
  loadAnimationMetadata,
} from "@lib/utils/animationTexture";

export interface AnimatedTextureInfo {
  texture: THREE.Texture;
  frameCount: number;
  frames: number[];
  frameTimesMs: number[];
  sequenceIndex: number;
  lastUpdateTime: number;
  interpolate: boolean;
  material?: THREE.ShaderMaterial;
}

export interface AnimUniforms {
  currentFrame: { value: number };
  nextFrame: { value: number };
  blendFactor: { value: number };
  [key: string]: THREE.IUniform;
}

export interface AnimMaterial extends THREE.Material {
  userData: {
    animUniforms?: AnimUniforms;
  } & Record<string, unknown>;
}

/**
 * Create a custom shader material for animated texture interpolation
 * Uses MeshStandardMaterial with onBeforeCompile to preserve lighting behavior
 */
export function createAnimatedTextureMaterial(
  texture: THREE.Texture,
  frameCount: number,
): THREE.ShaderMaterial {
  const clonedTexture = texture.clone();
  clonedTexture.needsUpdate = true;

  clonedTexture.repeat.set(1, 1);
  clonedTexture.offset.set(0, 0);

  const material = new THREE.MeshStandardMaterial({
    map: clonedTexture,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.FrontSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.frameCount = { value: frameCount };
    shader.uniforms.currentFrame = { value: 0 };
    shader.uniforms.nextFrame = { value: 0 };
    shader.uniforms.blendFactor = { value: 0.0 };

    (material as AnimMaterial).userData.animUniforms = shader.uniforms as unknown as AnimUniforms;

    shader.fragmentShader = `
      uniform float frameCount;
      uniform float currentFrame;
      uniform float nextFrame;
      uniform float blendFactor;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
        // Custom animated texture sampling with frame blending
        float frameHeight = 1.0 / frameCount;
        float currentFrameV = (frameCount - 1.0 - currentFrame) / frameCount;
        float nextFrameIndex = mod(nextFrame, frameCount);
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

  return material as unknown as THREE.ShaderMaterial;
}

/**
 * Setup animated texture configuration and register it for animation updates
 */
export async function setupAnimatedTexture(
  tex: THREE.Texture,
  textureUrl: string,
  textureId: string,
  animatedTextures: Map<THREE.Texture, AnimatedTextureInfo>,
): Promise<void> {
  if (!tex.image) return;

  const { width } = tex.image;
  const { height } = tex.image;

  const isAnimated = height > width && height % width === 0;
  if (!isAnimated) return;

  const frameCount = height / width;
  console.log(
    `[textureLoader] Animated texture: ${textureId} (${frameCount} frames, ${width}x${height})`,
  );

  tex.repeat.set(1, 1 / frameCount);

  const metadata = await loadAnimationMetadata(textureUrl);
  const timeline = buildAnimationTimeline(frameCount, metadata);
  const initialFrame = timeline.frames[0] ?? 0;
  const offset = (frameCount - 1 - initialFrame) / frameCount;
  tex.offset.set(0, offset);

  const interpolate = metadata?.interpolate ?? false;
  const material = interpolate
    ? createAnimatedTextureMaterial(tex, frameCount)
    : undefined;

  animatedTextures.set(tex, {
    texture: tex,
    frameCount,
    frames: timeline.frames,
    frameTimesMs: timeline.frameTimesMs,
    sequenceIndex: 0,
    lastUpdateTime: performance.now(),
    interpolate,
    material,
  });

  console.log(
    `[textureLoader] Registered animated texture: ${frameCount} frames @ ${timeline.frameTimesMs[0] ?? 50}ms/frame`,
  );
}
