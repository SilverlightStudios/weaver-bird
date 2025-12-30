import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { VariantChooser } from "@components/VariantChooser";
import { isEntityTexture } from "@lib/assetUtils";
import { useStore } from "@state/store";
import type { ProviderOption } from "../../types";

interface PackVariantsTabProps {
    assetId: string;
    providers: ProviderOption[];
    onSelectProvider: (packId: string) => void;
}

export const PackVariantsTab = ({
    assetId,
    providers,
    onSelectProvider,
}: PackVariantsTabProps) => {
    const animationVariant = useStore(
        (state) => state.entityAnimationVariantByAssetId[assetId] ?? "pack",
    );
    const setEntityAnimationVariant = useStore(
        (state) => state.setEntityAnimationVariant,
    );

    const showAnimationVariants = isEntityTexture(assetId);

    return (
        <TabsContent value="variants">
            <div>
                <h3>Texture Variants</h3>
                <Separator style={{ margin: "0.75rem 0" }} />
                <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                    This texture has variants from {providers.length} different resource
                    packs. Click on a variant below to switch between different visual
                    styles.
                </p>
                <VariantChooser
                    providers={providers}
                    onSelectProvider={onSelectProvider}
                    assetId={assetId}
                />

                {showAnimationVariants && (
                    <>
                        <Separator style={{ margin: "1rem 0" }} />
                        <h3>Animation Variants</h3>
                        <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                            Model + textures always come from the selected texture variant.
                            This setting only changes which animation system drives the entity.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <input
                                    type="radio"
                                    name={`anim-variant:${assetId}`}
                                    value="pack"
                                    checked={animationVariant === "pack"}
                                    onChange={() => setEntityAnimationVariant(assetId, "pack")}
                                />
                                Pack Animations
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <input
                                    type="radio"
                                    name={`anim-variant:${assetId}`}
                                    value="vanilla"
                                    checked={animationVariant === "vanilla"}
                                    onChange={() =>
                                        setEntityAnimationVariant(assetId, "vanilla")
                                    }
                                />
                                Vanilla Animations
                            </label>
                        </div>
                    </>
                )}
            </div>
        </TabsContent>
    );
};
