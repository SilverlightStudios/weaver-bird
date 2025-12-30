/**
 * Animation Texture Utilities
 *
 * Parses Minecraft animated textures and provides configurations for both
 * CSS and Three.js rendering to display only the first frame.
 *
 * Minecraft animated textures stack frames vertically:
 * - Each frame is square (width × width)
 * - Total height = width × number of frames
 * - Animation metadata is optionally stored in .mcmeta files
 *
 * Examples:
 * - seagrass.png: 16×288 (18 frames)
 * - water_still.png: 16×512 (32 frames)
 * - lava_still.png: 16×320 (20 frames)
 */

/**
 * Animation metadata from .mcmeta file
 *
 * Format: texture.png.mcmeta
 * {
 *   "animation": {
 *     "frametime": 1,
 *     "interpolate": false,
 *     "frames": [0, 1, 2, ...]
 *   }
 * }
 */
export interface AnimationMetadata {
  /** Ticks per frame (default: 1) */
  frametime: number;

  /** Whether to interpolate between frames (default: false) */
  interpolate: boolean;

  /**
   * Optional custom frame order
   * Can be simple numbers or objects with index and time
   */
  frames?: Array<number | { index: number; time?: number }>;
}

/**
 * Parsed animation texture information
 */
export interface ParsedAnimationTexture {
  /** Whether this texture is animated */
  isAnimated: boolean;

  /** Number of animation frames */
  frameCount: number;

  /** Width of each frame in pixels */
  frameWidth: number;

  /** Height of each frame in pixels */
  frameHeight: number;

  /** Animation metadata from .mcmeta file (if exists) */
  metadata: AnimationMetadata | null;

  /** CSS properties for displaying first frame in 2D rendering */
  firstFrameCSS: {
    width: string;
    height: string;
    objectFit: string;
    objectPosition: string;
  };

  /** Three.js texture configuration for displaying first frame */
  threeJsConfig: {
    /** UV repeat factors [u, v] */
    repeat: [number, number];

    /** UV offset [u, v] */
    offset: [number, number];
  };
}

/**
 * Load an image and get its dimensions
 *
 * @param url - Image URL
 * @returns Promise resolving to {width, height}
 */
async function getImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Allow cross-origin for Tauri converted file URLs
    img.crossOrigin = "anonymous";

    img.onload = () => {
      console.log(
        `[animationTexture] Image loaded: ${url} - ${img.naturalWidth}x${img.naturalHeight}`,
      );
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = (error) => {
      console.error(`[animationTexture] Failed to load image: ${url}`, error);
      reject(new Error(`Failed to load image: ${url}`));
    };

    // Start loading
    img.src = url;
  });
}

/**
 * Try to fetch and parse .mcmeta file
 *
 * @param textureUrl - URL to the texture PNG
 * @returns Animation metadata or null if not found/invalid
 */
async function tryLoadMcmeta(
  textureUrl: string,
): Promise<AnimationMetadata | null> {
  try {
    // .mcmeta files are named: texture.png.mcmeta
    const mcmetaUrl = `${textureUrl}.mcmeta`;

    const response = await fetch(mcmetaUrl);
    if (!response.ok) {
      // .mcmeta file doesn't exist - this is normal
      return null;
    }

    const text = await response.text();
    const json = JSON.parse(text);

    // Validate structure
    if (!json.animation || typeof json.animation !== "object") {
      console.warn(
        `[animationTexture] Invalid .mcmeta format for ${textureUrl}`,
      );
      return null;
    }

    const anim = json.animation;

    return {
      frametime: typeof anim.frametime === "number" ? anim.frametime : 1,
      interpolate:
        typeof anim.interpolate === "boolean" ? anim.interpolate : false,
      frames: Array.isArray(anim.frames) ? anim.frames : undefined,
    };
  } catch (error) {
    // Failed to load/parse .mcmeta - use defaults
    console.debug(
      `[animationTexture] Could not load .mcmeta for ${textureUrl}:`,
      error,
    );
    return null;
  }
}

/**
 * Check if texture dimensions indicate an animated texture
 *
 * A texture is animated if:
 * - Height > Width
 * - Height is evenly divisible by Width (perfect square frames)
 *
 * @param width - Texture width
 * @param height - Texture height
 * @returns true if texture appears to be animated
 */
function isAnimatedByDimensions(width: number, height: number): boolean {
  return height > width && height % width === 0;
}

/**
 * Parse an animated texture and return configuration for rendering
 *
 * This is the main entry point for animation texture handling.
 *
 * @param textureUrl - URL to the texture PNG file
 * @returns Parsed animation information
 *
 * @example
 * const animInfo = await parseAnimationTexture("assets/block/seagrass.png");
 * if (animInfo.isAnimated) {
 *   // Apply CSS styling
 *   img.style = animInfo.firstFrameCSS;
 *
 *   // Or configure Three.js texture
 *   texture.repeat.set(...animInfo.threeJsConfig.repeat);
 *   texture.offset.set(...animInfo.threeJsConfig.offset);
 * }
 */
export async function parseAnimationTexture(
  textureUrl: string,
): Promise<ParsedAnimationTexture> {
  try {
    // Load image to get dimensions
    const { width, height } = await getImageDimensions(textureUrl);

    // Check if texture is animated based on dimensions
    const isAnimated = isAnimatedByDimensions(width, height);

    if (!isAnimated) {
      // Not animated - return default config
      return {
        isAnimated: false,
        frameCount: 1,
        frameWidth: width,
        frameHeight: height,
        metadata: null,
        firstFrameCSS: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "0% 0%",
        },
        threeJsConfig: {
          repeat: [1, 1],
          offset: [0, 0],
        },
      };
    }

    // Calculate frame count
    const frameCount = height / width;

    // .mcmeta files are optional and provide frame timing/order customization.
    // Missing/invalid metadata is treated as null.
    const metadata = await tryLoadMcmeta(textureUrl);

    // Calculate configurations for displaying first frame only

    // CSS: Show only the top frame using object-position
    // object-fit: none means don't scale the image
    // object-position: 0% 0% means align to top-left
    // Then constrain with width/height to show only first frame
    const firstFrameCSS = {
      width: "100%",
      height: `${(1 / frameCount) * 100}%`, // Show only 1/frameCount of the image height
      objectFit: "none" as const,
      objectPosition: "0% 0%", // Align to top
    };

    // Three.js: Use repeat and offset to show only first frame
    // repeat.y = 1/frameCount (scale UV to only span one frame)
    // offset.y = (frameCount - 1) / frameCount (start from top frame)
    //
    // In Three.js, V coordinate 0 is at bottom, 1 is at top
    // Minecraft frames go top to bottom (frame 0 at top)
    // So we need to flip the V coordinate:
    // - repeat.y = 1/frameCount (only show 1 frame worth of V space)
    // - offset.y = (frameCount - 1) / frameCount (shift to show top frame)
    const threeJsConfig = {
      repeat: [1, 1 / frameCount] as [number, number],
      offset: [0, (frameCount - 1) / frameCount] as [number, number],
    };

    return {
      isAnimated: true,
      frameCount,
      frameWidth: width,
      frameHeight: width, // Frames are square
      metadata,
      firstFrameCSS,
      threeJsConfig,
    };
  } catch (error) {
    console.error(
      `[animationTexture] Failed to parse texture ${textureUrl}:`,
      error,
    );

    // Return safe defaults on error
    return {
      isAnimated: false,
      frameCount: 1,
      frameWidth: 16,
      frameHeight: 16,
      metadata: null,
      firstFrameCSS: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "0% 0%",
      },
      threeJsConfig: {
        repeat: [1, 1],
        offset: [0, 0],
      },
    };
  }
}

/**
 * Synchronous check if dimensions indicate animation
 *
 * Useful when you already have dimensions and don't need full parsing
 *
 * @param width - Texture width
 * @param height - Texture height
 * @returns true if dimensions indicate animation
 */
export function isAnimatedTexture(width: number, height: number): boolean {
  return isAnimatedByDimensions(width, height);
}

/**
 * Calculate animation frame count from dimensions
 *
 * @param width - Texture width
 * @param height - Texture height
 * @returns Number of frames (1 if not animated)
 */
export function getFrameCount(width: number, height: number): number {
  if (!isAnimatedByDimensions(width, height)) {
    return 1;
  }
  return height / width;
}

/**
 * Get Three.js repeat/offset config for a specific frame
 *
 * Allows selecting different frames, not just the first
 *
 * @param frameIndex - Frame to display (0-based)
 * @param totalFrames - Total number of frames
 * @returns repeat and offset config
 */
export function getThreeJsFrameConfig(
  frameIndex: number,
  totalFrames: number,
): { repeat: [number, number]; offset: [number, number] } {
  if (totalFrames <= 1) {
    return {
      repeat: [1, 1],
      offset: [0, 0],
    };
  }

  // Clamp frame index
  const frame = Math.max(0, Math.min(frameIndex, totalFrames - 1));

  // Calculate offset for this frame
  // Frame 0 is at top, so offset = (totalFrames - 1 - frameIndex) / totalFrames
  const offset = (totalFrames - 1 - frame) / totalFrames;

  return {
    repeat: [1, 1 / totalFrames],
    offset: [0, offset],
  };
}
