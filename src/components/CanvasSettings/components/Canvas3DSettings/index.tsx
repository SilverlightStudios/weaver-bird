import { useStore } from "@state/store";
import { Separator } from "@/ui/components/Separator/Separator";
import { SettingCheckbox } from "../SettingCheckbox";

export const Canvas3DSettings = () => {
    const canvas3DShowGrid = useStore((state) => state.canvas3DShowGrid);
    const setCanvas3DShowGrid = useStore((state) => state.setCanvas3DShowGrid);
    const showBlockParticles = useStore((state) => state.showBlockParticles);
    const setShowBlockParticles = useStore((state) => state.setShowBlockParticles);

    return (
        <div>
            <h3>3D Canvas Settings</h3>
            <Separator style={{ margin: "0.75rem 0" }} />

            <SettingCheckbox
                label="Show Floor Grid"
                description="Display a floor grid beneath blocks for spatial reference in the 3D preview."
                checked={canvas3DShowGrid}
                onChange={setCanvas3DShowGrid}
            />

            <SettingCheckbox
                label="Show Block Particles"
                description="Display particle effects emitted by blocks (torch flames, campfire smoke, etc.)."
                checked={showBlockParticles}
                onChange={setShowBlockParticles}
            />
        </div>
    );
};
