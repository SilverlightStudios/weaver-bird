export interface TextureVariantSelectorProps {
    assetId?: string;
    allAssets: Array<{ id: string; name: string }>;
    selectedVariantId?: string; // Currently viewing variant (view-only, local state)
    onSelectVariant: (variantId: string) => void;
}

export type ViewMode = "world" | "inventory";
