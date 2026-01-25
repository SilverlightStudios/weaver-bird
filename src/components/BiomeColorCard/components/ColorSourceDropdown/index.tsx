import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/ui/components/DropdownMenu";
import type { ColorSourceDropdownProps } from "./types";
import s from "./styles.module.scss";

export const ColorSourceDropdown = ({
    sourceOptions,
    selectedSource,
    isAutoSelected,
    onSourceSelect,
}: ColorSourceDropdownProps) => {
    const currentSourceLabel = isAutoSelected
        ? `Pack order (${selectedSource?.packName ?? "Default"})`
        : (selectedSource?.label ?? "Select source");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={s.dropdownTrigger} type="button">
                    <span className={s.dropdownLabel}>Source</span>
                    <span className={s.dropdownValue}>{currentSourceLabel}</span>
                    <span className={s.dropdownChevron}>▼</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Colormap Source</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={() => onSourceSelect("__auto")}
                    className={isAutoSelected ? s.selectedItem : ""}
                >
                    Pack order ({selectedSource?.packName ?? "Default"})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {sourceOptions.map((option) => (
                    <DropdownMenuItem
                        key={option.id}
                        onSelect={() => onSourceSelect(option.id)}
                        className={
                            !isAutoSelected && selectedSource?.id === option.id
                                ? s.selectedItem
                                : ""
                        }
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
