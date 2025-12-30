import type { AssetId } from "@state";

export type EntityFeatureControl =
  | {
      kind: "toggle";
      id: string;
      label: string;
      defaultValue: boolean;
      description?: string;
    }
  | {
      kind: "select";
      id: string;
      label: string;
      defaultValue: string;
      options: Array<{ value: string; label: string }>;
      description?: string;
    };

export type EntityLayerKind = "cloneTexture" | "cemModel";

export type EntityLayerBlend = "normal" | "additive";

export type EntityLayerMaterialMode =
  | { kind: "default" }
  /**
   * Color multiplier in sRGB space (0..1), matching Minecraft's
   * `DyeColor#getTextureDiffuseColors` constants.
   *
   * Three.js PBR materials expect linear color values, so the renderer must
   * convert this to linear before applying it to `material.color`.
   */
  | { kind: "tint"; color: { r: number; g: number; b: number } }
  | { kind: "emissive"; intensity?: number };

export interface EntityLayerDefinitionBase {
  id: string;
  label: string;
  kind: EntityLayerKind;
  blend: EntityLayerBlend;
  /**
   * Higher values render later (in front).
   * Used to avoid z-fighting and preserve expected compositing order.
   */
  zIndex: number;
  /**
   * Opacity multiplier for the overlay material (0..1).
   */
  opacity?: number;
  materialMode?: EntityLayerMaterialMode;
}

export interface EntityCloneTextureLayerDefinition
  extends EntityLayerDefinitionBase {
  kind: "cloneTexture";
  textureAssetId: AssetId;
}

export interface EntityCemModelLayerDefinition
  extends EntityLayerDefinitionBase {
  kind: "cemModel";
  /**
   * JEM entity type candidates to try (e.g. ["sheep_wool", "sheep_fur"]).
   * The loader attempts each candidate in pack-priority order and falls back
   * to vanilla mocks when available.
   */
  cemEntityTypeCandidates: string[];
  textureAssetId: AssetId;
}

export type EntityLayerDefinition =
  | EntityCloneTextureLayerDefinition
  | EntityCemModelLayerDefinition;

export interface EntityCompositeSchema {
  baseAssetId: AssetId;
  entityRoot: string;
  controls: EntityFeatureControl[];
  /**
   * Optional base texture override (e.g. bee angry/nectar variants) while keeping
   * geometry tied to the selected entity/model asset.
   */
  getBaseTextureAssetId?: (state: EntityFeatureStateView) => AssetId;
  /**
   * Optional override for the base CEM/JEM entity type to load for this texture.
   * Useful for "block entity" textures that share a texture family but have
   * multiple model configurations (e.g. wall vs standing banners).
   */
  getCemEntityType?: (
    state: EntityFeatureStateView,
  ) => { entityType: string; parentEntity?: string | null };
  /**
   * Optional transform applied to the *root group* (not individual bones).
   * Values are additive to the model's baseline transform and expressed in
   * Three.js units/radians.
   */
  getRootTransform?: (
    state: EntityFeatureStateView,
  ) => {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
  /**
   * Optional direct overrides for bone render properties (applied after each tick).
   * Use for configuration toggles that must work even without JPM animations.
   */
  getBoneRenderOverrides?: (
    state: EntityFeatureStateView,
  ) => Partial<Record<string, { visible?: boolean }>>;
  /**
   * Optional per-frame bone input overrides applied before evaluating CEM/JPM.
   * Useful for vanilla-driven booleans that packs expose via `bone.visible`
   * (e.g. bee stinger present / absent).
   *
   * Values are raw numeric CEM properties (pixels/radians/0..1 for visible).
   */
  getBoneInputOverrides?: (
    state: EntityFeatureStateView,
  ) => Record<string, Record<string, number>>;
  /**
   * Returns the layers to render for the current feature state.
   */
  getActiveLayers: (state: EntityFeatureStateView) => EntityLayerDefinition[];
}

export interface EntityFeatureStateView {
  toggles: Record<string, boolean | undefined>;
  selects: Record<string, string | undefined>;
}
