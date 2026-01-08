export interface TabIconProps {
    icon: string;
    label: string;
    value: string;
}

export interface ProviderOption {
    packId: string;
    packName: string;
    isPenciled?: boolean;
    isWinner?: boolean;
}

export interface OptionsPanelProps {
    assetId?: string;
    providers?: ProviderOption[];
    onSelectProvider?: (packId: string) => void;
    onBlockPropsChange?: (props: Record<string, string>) => void;
    onSeedChange?: (seed: number) => void;
    onParticleConditionOverridesChange?: (overrides: Record<string, string>) => void;
    allAssets?: Array<{ id: string; name: string }>;
    onSelectVariant?: (variantId: string) => void;
    onViewingVariantChange?: (variantId: string | undefined) => void;
    itemDisplayMode?: import("@lib/itemDisplayModes").ItemDisplayMode;
    onItemDisplayModeChange?: (mode: import("@lib/itemDisplayModes").ItemDisplayMode) => void;
}
