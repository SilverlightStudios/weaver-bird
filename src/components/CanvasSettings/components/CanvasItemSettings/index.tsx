import { useMemo } from "react";
import { useStore } from "@state/store";
import { Separator } from "@/ui/components/Separator/Separator";
import { Select } from "@/ui/components/Select/Select";
import { SettingCheckbox } from "../SettingCheckbox";
import s from "./styles.module.scss";

export const CanvasItemSettings = () => {
    const canvasItemShowGrid = useStore((state) => state.canvasItemShowGrid);
    const canvasItemRotate = useStore((state) => state.canvasItemRotate);
    const canvasItemHover = useStore((state) => state.canvasItemHover);
    const canvasItemAnimate = useStore((state) => state.canvasItemAnimate);
    const canvasItemAnimationFrame = useStore(
        (state) => state.canvasItemAnimationFrame,
    );
    const canvasItemAnimationFrameCount = useStore(
        (state) => state.canvasItemAnimationFrameCount,
    );
    const setCanvasItemShowGrid = useStore(
        (state) => state.setCanvasItemShowGrid,
    );
    const setCanvasItemRotate = useStore((state) => state.setCanvasItemRotate);
    const setCanvasItemHover = useStore((state) => state.setCanvasItemHover);
    const setCanvasItemAnimate = useStore(
        (state) => state.setCanvasItemAnimate,
    );
    const setCanvasItemAnimationFrame = useStore(
        (state) => state.setCanvasItemAnimationFrame,
    );

    const frameOptions = useMemo(() => {
        const options = [{ value: "-1", label: "Auto" }];
        for (let i = 0; i < canvasItemAnimationFrameCount; i += 1) {
            options.push({ value: String(i), label: `Frame ${i + 1}` });
        }
        return options;
    }, [canvasItemAnimationFrameCount]);

    const frameSelectDisabled =
        canvasItemAnimationFrameCount <= 1 || canvasItemAnimate;

    return (
        <div>
            <h3>Item Canvas Settings</h3>
            <Separator style={{ margin: "0.75rem 0" }} />

            <SettingCheckbox
                label="Show Grid"
                checked={canvasItemShowGrid}
                onChange={setCanvasItemShowGrid}
            />

            <SettingCheckbox
                label="Rotate Animation"
                checked={canvasItemRotate}
                onChange={setCanvasItemRotate}
            />

            <SettingCheckbox
                label="Hover Animation"
                description="Control the display and animation settings for dropped items in the preview canvas."
                checked={canvasItemHover}
                onChange={setCanvasItemHover}
            />

            <SettingCheckbox
                label="Animate Textures"
                checked={canvasItemAnimate}
                onChange={(checked) => {
                    setCanvasItemAnimate(checked);
                    if (checked) {
                        setCanvasItemAnimationFrame(-1);
                    } else if (
                        canvasItemAnimationFrame < 0 &&
                        canvasItemAnimationFrameCount > 0
                    ) {
                        setCanvasItemAnimationFrame(0);
                    }
                }}
            />

            <div
                className={`${s.selectRow} ${frameSelectDisabled ? s.disabled : ""}`}
                aria-disabled={frameSelectDisabled}
            >
                <span className={s.selectLabel}>Animation Frame</span>
                <Select
                    options={frameOptions}
                    value={String(canvasItemAnimationFrame)}
                    onValueChange={(value) =>
                        setCanvasItemAnimationFrame(Number(value))
                    }
                    placeholder="Auto"
                    className={s.selectControl}
                />
                <p className={s.description}>
                    Choose a frame to preview when animation is paused.
                </p>
            </div>
        </div>
    );
};
