import { useEffect, useMemo } from "react";
import { useStore } from "@state/store";
import { Separator } from "@/ui/components/Separator/Separator";
import { Select } from "@/ui/components/Select/Select";
import { useSelectAllAssets } from "@state/selectors";
import { getBlockItemPair } from "@lib/assetUtils";
import { SettingCheckbox } from "../SettingCheckbox";
import s from "./styles.module.scss";

export const Canvas2DSettings = () => {
    const canvas2DShowPixelGrid = useStore(
        (state) => state.canvas2DShowPixelGrid,
    );
    const canvas2DShowUVWrap = useStore((state) => state.canvas2DShowUVWrap);
    const canvas2DTextureSource = useStore(
        (state) => state.canvas2DTextureSource,
    );
    const setCanvas2DShowPixelGrid = useStore(
        (state) => state.setCanvas2DShowPixelGrid,
    );
    const setCanvas2DShowUVWrap = useStore(
        (state) => state.setCanvas2DShowUVWrap,
    );
    const setCanvas2DTextureSource = useStore(
        (state) => state.setCanvas2DTextureSource,
    );
    const selectedAssetId = useStore((state) => state.selectedAssetId);
    const allAssets = useSelectAllAssets();
    const allAssetIds = useMemo(() => allAssets.map((a) => a.id), [allAssets]);
    const pair = useMemo(() => {
        if (!selectedAssetId) return null;
        return getBlockItemPair(selectedAssetId, allAssetIds);
    }, [allAssetIds, selectedAssetId]);
    const hasBlockItemPair = Boolean(pair?.blockId && pair?.itemId);

    useEffect(() => {
        if (!hasBlockItemPair) {
            setCanvas2DTextureSource("block");
        }
    }, [hasBlockItemPair, setCanvas2DTextureSource]);

    return (
        <div>
            <h3>2D Canvas Settings</h3>
            <Separator style={{ margin: "0.75rem 0" }} />

            <SettingCheckbox
                label="Show Pixel Grid"
                description="Display a pixel grid overlay to help visualize individual pixels in the texture."
                checked={canvas2DShowPixelGrid}
                onChange={setCanvas2DShowPixelGrid}
            />

            <SettingCheckbox
                label="Show UV Wrap"
                description="Display colored boxes showing where entity model parts map to the texture (entities only)."
                checked={canvas2DShowUVWrap}
                onChange={setCanvas2DShowUVWrap}
            />

            {hasBlockItemPair && (
                <div className={s.selectRow}>
                    <span className={s.selectLabel}>Texture Source</span>
                    <Select
                        options={[
                            { value: "block", label: "Block Texture" },
                            { value: "item", label: "Item Texture" },
                        ]}
                        value={canvas2DTextureSource}
                        onValueChange={(value) =>
                            setCanvas2DTextureSource(
                                value === "item" ? "item" : "block",
                            )
                        }
                        placeholder="Block Texture"
                        className={s.selectControl}
                    />
                    <p className={s.description}>
                        Choose which texture to display in the 2D preview.
                    </p>
                </div>
            )}
        </div>
    );
};
