import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/ui/components/Tooltip";
import type { BiomeHotspotProps } from "./types";
import s from "./styles.module.scss";

export const BiomeHotspot = ({
    biomes,
    x,
    y,
    maxX,
    maxY,
    isSelected,
    isHovered,
    onSelect,
    onMouseEnter,
    onMouseLeave,
    readOnly,
}: BiomeHotspotProps) => {
    const leftPercent = (x / maxX) * 100;
    const topPercent = (y / maxY) * 100;

    return (
        <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
                <button
                    className={`${s.hotspot} ${isSelected ? s.selected : ""} ${isHovered ? s.hovered : ""}`}
                    style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                    }}
                    onClick={onSelect}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    disabled={readOnly}
                >
                    <span className={s.dot} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
                {biomes.length > 1 ? (
                    <div>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: "1.2em",
                                textAlign: "left",
                                listStyleType: "disc",
                            }}
                        >
                            {biomes.map((biome) => (
                                <li key={biome.id} style={{ display: "list-item" }}>
                                    {biome.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    biomes[0].name
                )}
            </TooltipContent>
        </Tooltip>
    );
};
