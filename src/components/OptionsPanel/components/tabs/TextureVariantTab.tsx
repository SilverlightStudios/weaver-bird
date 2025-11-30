import { TabsContent } from "@/ui/components/tabs";
import { TextureVariantSelector } from "@components/TextureVariantSelector";

interface TextureVariantTabProps {
    assetId: string;
    allAssets: Array<{ id: string; name: string }>;
    selectedVariantId: string | undefined;
    onSelectVariant: (variantId: string | undefined) => void;
}

export const TextureVariantTab = ({
    assetId,
    allAssets,
    selectedVariantId,
    onSelectVariant,
}: TextureVariantTabProps) => {
    return (
        <TabsContent value="texture-variants">
            <div>
                <TextureVariantSelector
                    assetId={assetId}
                    allAssets={allAssets}
                    selectedVariantId={selectedVariantId}
                    onSelectVariant={onSelectVariant}
                />
            </div>
        </TabsContent>
    );
};
