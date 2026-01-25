import type { TabItem } from "@/ui/components/blocky-tabs/types";
import { OptionsPanel } from "@components/OptionsPanel";
import pickaxeImg from "@/assets/textures/pickaxe.png";
import type { PackMeta, AssetRecord } from "@state";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";

interface BlockPropertiesTabProps {
  blockItemPair: { blockId: string; itemId: string } | null;
  selectedAssetId: string | null;
  providers: Array<{ packId: string; pack: PackMeta }>;
  handleSelectProvider: (packId: string) => void;
  setBlockProps: (props: Record<string, string>) => void;
  setSeed: (seed: number) => void;
  setParticleConditionOverrides: (overrides: Record<string, string>) => void;
  allAssets: AssetRecord[];
  setSelectedAsset: (assetId: string) => void;
  setViewingVariantId: (id: string | undefined) => void;
  itemDisplayMode: ItemDisplayMode;
  setItemDisplayMode: (mode: ItemDisplayMode) => void;
}

export function createBlockPropertiesTab(props: BlockPropertiesTabProps): TabItem {
  return {
    id: "block-properties",
    label: "Block Properties",
    icon: pickaxeImg,
    color: "#FF9800",
    defaultDrawerSize: 30,
    content: (
      <OptionsPanel
        assetId={
          props.blockItemPair?.blockId ?? props.selectedAssetId
        }
        providers={props.providers}
        onSelectProvider={props.handleSelectProvider}
        onBlockPropsChange={props.setBlockProps}
        onSeedChange={props.setSeed}
        onParticleConditionOverridesChange={props.setParticleConditionOverrides}
        allAssets={props.allAssets.map((a: AssetRecord) => ({
          id: a.id,
          name: a.id,
        }))}
        onSelectVariant={props.setSelectedAsset}
        onViewingVariantChange={props.setViewingVariantId}
        itemDisplayMode={props.itemDisplayMode}
        onItemDisplayModeChange={props.setItemDisplayMode}
      />
    ),
  };
}
