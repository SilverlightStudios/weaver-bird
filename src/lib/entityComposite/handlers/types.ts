import type { AssetId } from "@state";
import type {
  EntityCompositeSchema,
  EntityFeatureControl,
  EntityFeatureStateView,
  EntityLayerDefinition,
} from "../types";

export interface EntityHandlerContext {
  all: Set<AssetId>;
  ns: string;
  baseAssetId: AssetId;
  entityPath: string;
  folderRoot: string;
  dir: string;
  leaf: string;
  entityType: string;
  selectedAssetId: AssetId;
  allAssetIds: AssetId[];
}

export interface EntityHandlerResult {
  controls?: EntityFeatureControl[];
  getBaseTextureAssetId?: EntityCompositeSchema["getBaseTextureAssetId"];
  getCemEntityType?: EntityCompositeSchema["getCemEntityType"];
  getRootTransform?: EntityCompositeSchema["getRootTransform"];
  getBoneRenderOverrides?: EntityCompositeSchema["getBoneRenderOverrides"];
  getBoneInputOverrides?: EntityCompositeSchema["getBoneInputOverrides"];
  getEntityStateOverrides?: EntityCompositeSchema["getEntityStateOverrides"];
  getPartTextureOverrides?: EntityCompositeSchema["getPartTextureOverrides"];
  getLayerContributions?: (state: EntityFeatureStateView) => EntityLayerDefinition[];
  baseAssetIdOverride?: AssetId;
}

export type EntityHandler = (context: EntityHandlerContext) => EntityHandlerResult | null;
