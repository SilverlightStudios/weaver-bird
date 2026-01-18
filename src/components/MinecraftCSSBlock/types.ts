import type { ParsedEntityModel } from "@lib/emf/jemLoader";

export interface MinecraftCSSBlockProps {
    /** Asset ID (texture ID like "minecraft:block/oak_planks") */
    assetId: string;
    /** ID of the winning pack for this asset */
    packId?: string;
    /** Alt text for accessibility */
    alt?: string;
    /** Size of the block in pixels (default 64) */
    size?: number;
    /** Index for staggering 3D model loading to prevent simultaneous transitions */
    staggerIndex?: number;
    /** Callback when textures fail to load */
    onError?: () => void;

    // Entity rendering support
    /** Rendering mode: "block" (default) or "entity" */
    renderMode?: "block" | "entity";
    /** Parsed JEM entity model (required when renderMode is "entity") */
    jemModel?: ParsedEntityModel;
    /** Entity texture URL (required when renderMode is "entity") */
    entityTextureUrl?: string;
}

/** Represents a rendered face with all data needed for CSS */
export interface NormalizedUV {
    u: number;
    v: number;
    width: number;
    height: number;
    flipX: 1 | -1;
    flipY: 1 | -1;
}

export interface RenderedFace {
    type: "top" | "left" | "right";
    textureUrl: string;
    // Position in isometric space (pixels)
    x: number;
    y: number;
    z: number;
    // Size of the face (pixels)
    width: number;
    height: number;
    // UV coordinates for texture clipping (0-1)
    uv: NormalizedUV;
    // Z-index for depth sorting
    zIndex: number;
    // Brightness for shading
    brightness: number;
    // Tint type to apply (grass or foliage)
    tintType?: "grass" | "foliage";
    // Pre-baked transform from worker
    transform?: string;
}

/** Represents a complete element with its faces */
export interface RenderedElement {
    faces: RenderedFace[];
}
