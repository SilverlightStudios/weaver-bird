import type { AssetId } from "@state";
import type { EntityState } from "@lib/emf/animation/types";

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
  | { kind: "emissive"; intensity?: number }
  /**
   * Minecraft-style "energy swirl" effect (charged creeper).
   * Implemented as an emissive/additive unlit material with scrolling UVs.
   */
  | {
      kind: "energySwirl";
      intensity?: number;
      repeat?: number;
      scroll?: { uPerSec: number; vPerSec: number };
    };

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
   * Optional per-layer visibility overrides applied after syncing this layer's
   * bones to the base pose. Useful for "show only helmet" style controls.
   */
  boneRenderOverrides?: Partial<Record<string, { visible?: boolean }>>;
  /**
   * Optional per-layer mapping from overlay bone name -> base bone name.
   * Useful when a vanilla equipment model uses different bone names than the
   * owning entity model (e.g. horse_saddle's `headpiece` should follow `head`).
   */
  boneAliasMap?: Record<string, string>;
  /**
   * Optional list of base-model bones that should be hidden when this layer
   * successfully loads. Useful when a pack bakes geometry into the base model
   * but ships a separate CEM overlay in newer versions.
   */
  replacesBaseBones?: string[];
  /**
   * When false, avoid falling back to vanilla CEM files if this layer's CEM
   * is missing in the active model pack. Defaults to true.
   */
  allowVanillaFallback?: boolean;
  /**
   * Optional per-layer bone position offsets (in Three.js units) applied after
   * syncing the overlay rig to the base pose. Offsets are additive and applied
   * every frame, but since overlays are re-synced each tick, this does not
   * accumulate.
   *
   * Useful for small fit tweaks (e.g. nudging armor helmets up to avoid
   * coplanar z-fighting with the underlay head).
   */
  bonePositionOffsets?: Record<string, { x: number; y: number; z: number }>;
  /**
   * Optional per-layer bone scale multipliers applied after syncing the overlay
   * rig to the base pose. Values are multiplicative and applied every frame,
   * but since overlays are re-synced each tick, this does not accumulate.
   *
   * Useful for small fit tweaks (e.g. armor helmets sitting slightly above the
   * head without editing vanilla JEM files).
   */
  boneScaleMultipliers?: Record<
    string,
    { x: number; y: number; z: number }
  >;
  /**
   * When true, ignore overlay JPM animations and always sync this layer's bones
   * to the base pose. Useful for equipment that should inherit the base rig.
   */
  syncToBasePose?: boolean;
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
   *
   * Special key `"*"` applies defaults to all bones (useful for "show only X"
   * configurations without needing to enumerate every bone name).
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
   * Optional entity-state overrides applied every frame (e.g. mark a horse as
   * `is_ridden` when the saddle toggle is enabled).
   */
  getEntityStateOverrides?: (state: EntityFeatureStateView) => Partial<EntityState>;
  /**
   * Optional per-part texture override map for the base model conversion.
   *
   * Keys are JEM part/bone names. Values are texture asset IDs to load and
   * apply for that part (and its boxes). Useful for block-entity style rigs
   * that combine multiple textures (e.g. decorated pot base + sherd patterns).
   */
  getPartTextureOverrides?: (
    state: EntityFeatureStateView,
  ) => Partial<Record<string, AssetId>>;
  /**
   * Returns the layers to render for the current feature state.
   */
  getActiveLayers: (state: EntityFeatureStateView) => EntityLayerDefinition[];
}

export interface EntityFeatureStateView {
  toggles: Record<string, boolean | undefined>;
  selects: Record<string, string | undefined>;
}
